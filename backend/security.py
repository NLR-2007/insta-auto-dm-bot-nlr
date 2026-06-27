import base64
import hashlib
import hmac
import json
from typing import Any, Optional

from cryptography.fernet import Fernet, InvalidToken

from backend.config import is_production, settings


def _derive_dev_key() -> bytes:
    digest = hashlib.sha256(settings.API_SECRET_KEY.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY.strip()
    if not key:
        if is_production():
            raise RuntimeError("ENCRYPTION_KEY is required in production.")
        return Fernet(_derive_dev_key())
    try:
        return Fernet(key.encode("utf-8"))
    except Exception:
        digest = hashlib.sha256(key.encode("utf-8")).digest()
        return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return value
    token = _get_fernet().encrypt(value.encode("utf-8")).decode("utf-8")
    return f"enc:v1:{token}"


def decrypt_secret(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return value
    if not value.startswith("enc:v1:"):
        return value
    token = value.removeprefix("enc:v1:")
    try:
        return _get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return None


def encrypt_json(payload: Any) -> str:
    return encrypt_secret(json.dumps(payload, separators=(",", ":"))) or ""


def decrypt_json(value: Optional[str]) -> Any:
    raw = decrypt_secret(value)
    if not raw:
        return None
    return json.loads(raw)


def mask_secret(value: Optional[str], visible: int = 4) -> str:
    raw = decrypt_secret(value)
    if not raw:
        return ""
    if len(raw) <= visible * 2:
        return "*" * len(raw)
    return f"{raw[:visible]}...{raw[-visible:]}"


def secret_configured(value: Optional[str]) -> bool:
    return bool(decrypt_secret(value))


def stable_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def verify_meta_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    if not settings.META_APP_SECRET:
        return not is_production()
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    received = signature_header.split("=", 1)[1]
    digest = hmac.new(
        settings.META_APP_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(received, digest)
