import httpx
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db, Setting, MonitoredPost, ProcessedComment, OptOut, log_to_db, MessageTemplate
from backend.bot import parse_spintax
from backend.security import decrypt_secret, verify_meta_signature
from typing import Dict, Any

router = APIRouter(prefix="/api/webhooks", tags=["Meta Webhooks"])

@router.get("/instagram")
async def verify_webhook(
    db: Session = Depends(get_db),
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token")
):
    """
    Handles Meta's Webhook verification challenge during configuration.
    Verify Token must match the configured token in Settings.
    """
    token_setting = db.query(Setting).filter(Setting.key == "meta_verify_token").first()
    expected_token = decrypt_secret(token_setting.value) if token_setting else ""
    
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        log_to_db("SUCCESS", "Official Meta webhook verified successfully!")
        return int(hub_challenge)
    
    log_to_db("WARNING", "Official Meta Webhook verification failed. Token mismatch.")
    raise HTTPException(status_code=403, detail="Verification token mismatch")

@router.post("/instagram")
async def receive_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Receives real-time events (comments, messages) from Meta.
    Filters triggers, checks opt-out blocklists, and dispatches compliant replies.
    """
    # Check if Official Meta mode is active
    mode_setting = db.query(Setting).filter(Setting.key == "api_mode").first()
    if not mode_setting or mode_setting.value != "official":
        return {"status": "ignored", "reason": "Official Meta API mode is not active"}

    raw_body = await request.body()
    if not verify_meta_signature(raw_body, request.headers.get("x-hub-signature-256")):
        log_to_db("WARNING", "Rejected Meta webhook payload with invalid signature.")
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    try:
        import json
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Meta webhook structure loops
    if payload.get("object") != "instagram":
        return {"status": "ignored", "reason": "Not an Instagram event"}

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            field = change.get("field")
            value = change.get("value", {})
            
            if field == "comments":
                await process_incoming_comment(value, db)
                
    return {"status": "processed"}

async def process_incoming_comment(value: Dict[str, Any], db: Session):
    """
    Parses a comment, checks trigger matching, verifies consent/opt-out status,
    and dispatches a DM back to the creator's follower.
    """
    comment_id = value.get("id")
    comment_text = value.get("text", "").strip()
    media_info = value.get("media", {})
    post_ig_id = media_info.get("id") # Reel or Post ID
    commenter = value.get("from", {})
    commenter_username = commenter.get("username")
    commenter_id = commenter.get("id")
    
    if not comment_id or not commenter_username:
        return

    log_to_db("INFO", f"[Meta Webhook] Received comment from @{commenter_username}: '{comment_text}'")

    # 1. Opt-out keyword check
    opt_out_setting = db.query(Setting).filter(Setting.key == "opt_out_keywords").first()
    opt_out_keywords = [k.strip().lower() for k in (opt_out_setting.value if opt_out_setting else "").split(",") if k.strip()]
    
    if comment_text.lower() in opt_out_keywords:
        log_to_db("WARNING", f"[COMPLIANCE] Received opt-out keyword from @{commenter_username}; tenant-scoped blocklist requires matched post context.")
        return

    # 2. Query blocklist check
    blocked = db.query(OptOut).filter(OptOut.username == commenter_username.lower()).first()
    if blocked:
        log_to_db("WARNING", f"[COMPLIANCE] Ignored trigger: @{commenter_username} is in the blocklist.")
        return

    # 3. Look up active monitored post match by post URL or ID string
    # Meta webhook returns numeric ID. We search monitored posts containing this ID in URL or map them
    monitored_posts = db.query(MonitoredPost).filter(MonitoredPost.is_active == True).all()
    matched_post = None
    for p in monitored_posts:
        if post_ig_id in p.post_url or p.post_url.rstrip("/").split("/")[-1] in p.post_url:
            matched_post = p
            break
            
    # Fallback to general keyword match on any post if no exact post ID mapping matched
    if not matched_post and monitored_posts:
        # Check if consent enforce settings is disabled. If enabled, only match registered keywords
        consent_enforce = db.query(Setting).filter(Setting.key == "consent_enforce").first()
        if not consent_enforce or consent_enforce.value == "true":
            # Match post by keyword
            for p in monitored_posts:
                if p.trigger_keyword.strip().lower() == comment_text.lower():
                    matched_post = p
                    break
        else:
            # Match first active post config if consent enforcing is bypassed
            matched_post = monitored_posts[0]

    if not matched_post:
        return

    # Enforce trigger keyword matching
    if matched_post.trigger_keyword.strip().lower() != comment_text.lower():
        return

    # 4. Check processed comments history (deduplication)
    history_exists = db.query(ProcessedComment).filter(
        ProcessedComment.username == commenter_username,
        ProcessedComment.post_id == matched_post.id
    ).first()
    
    if history_exists:
        log_to_db("INFO", f"Skipped processed comment from @{commenter_username} on post ID {matched_post.id} to prevent duplicate spam.")
        return

    # 5. Fetch and compile template
    template = db.query(MessageTemplate).filter(MessageTemplate.id == matched_post.template_id).first()
    if not template or not template.is_active:
        log_to_db("WARNING", f"No active template found for Monitored Post ID {matched_post.id}")
        return

    raw_message = template.content
    message_text = parse_spintax(raw_message).replace("{username}", commenter_username)

    # 6. Send message via official Graph API Page Access Token
    token_setting = db.query(Setting).filter(Setting.key == "meta_page_access_token").first()
    page_access_token = decrypt_secret(token_setting.value) if token_setting else ""
    
    if not page_access_token:
        log_to_db("ERROR", "Failed to send DM: Meta Page Access Token is not configured.")
        # Mark as failed in history
        db.add(ProcessedComment(
            username=commenter_username,
            post_id=matched_post.id,
            comment_text=comment_text,
            status="failed"
        ))
        db.commit()
        return

    success = await send_official_meta_dm(comment_id, message_text, page_access_token)
    
    # 7. Record History
    db.add(ProcessedComment(
        username=commenter_username,
        post_id=matched_post.id,
        comment_text=comment_text,
        status="sent" if success else "failed"
    ))
    db.commit()
    
    if success:
        log_to_db("SUCCESS", f"[Meta API] Private DM sent to @{commenter_username} in response to comment.")
    else:
        log_to_db("ERROR", f"[Meta API] Failed to send private DM to @{commenter_username}.")

async def send_official_meta_dm(comment_id: str, text: str, page_access_token: str) -> bool:
    """
    Sends an official Instagram Private Reply to a comment.
    Utilizes Instagram Direct Messages API.
    """
    url = f"https://graph.facebook.com/v20.0/me/messages?access_token={page_access_token}"
    headers = {"Content-Type": "application/json"}
    
    # Private reply payload structure linking comment_id
    payload = {
        "recipient": {
            "comment_id": comment_id
        },
        "message": {
            "text": text
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=10.0)
            res_data = response.json()
            if response.status_code == 200 and "message_id" in res_data:
                return True
            else:
                log_to_db("ERROR", f"Meta Send API error response: {res_data}")
                return False
    except Exception as e:
        log_to_db("ERROR", f"Meta Send API request exception: {e}")
        return False
