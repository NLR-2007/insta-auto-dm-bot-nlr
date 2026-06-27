import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from backend.config import settings
from backend.database import get_db, User, Workspace, WorkspaceMember

# JWT Configuration values
SECRET_KEY = settings.API_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Encodes session details into a signed JWT token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency verifying incoming requests containing active authenticated sessions."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None or not getattr(user, "is_enabled", True):
        raise credentials_exception
    return user

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Checks whether the verified caller is configured as an Administrator."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have administrative privileges to access this resource."
        )
    return current_user


def get_current_workspace(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Workspace:
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.user_id == current_user.id
    ).order_by(WorkspaceMember.id.asc()).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No workspace is available for this account."
        )
    return membership.workspace


def require_workspace_role(*allowed_roles: str):
    def dependency(
        current_user: User = Depends(get_current_user),
        workspace: Workspace = Depends(get_current_workspace),
        db: Session = Depends(get_db),
    ) -> Workspace:
        membership = db.query(WorkspaceMember).filter(
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.workspace_id == workspace.id,
        ).first()
        if not membership or membership.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your workspace role cannot perform this action."
            )
        return workspace
    return dependency
