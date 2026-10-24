import os
import random
import string
from datetime import datetime, timedelta
from functools import wraps
import bcrypt
import jwt
from flask import request, jsonify, current_app
from ..database import get_db
from ..models import User

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def check_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def generate_token(user: User) -> str:
    secret = current_app.config["SECRET_KEY"]
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=current_app.config.get("JWT_EXPIRATION_HOURS", 168)),
    }
    return jwt.encode(payload, secret, algorithm=current_app.config.get("JWT_ALGORITHM", "HS256"))

def decode_token(token: str):
    secret = current_app.config["SECRET_KEY"]
    try:
        return jwt.decode(token, secret, algorithms=[current_app.config.get("JWT_ALGORITHM", "HS256")])
    except Exception:
        return None

def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:].strip()
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        return None
    db = get_db()
    try:
        uid = int(payload["sub"])
        return db.query(User).filter_by(id=uid).first()
    except (ValueError, TypeError):
        return None

def auth_required(roles=None):
    if isinstance(roles, str):
        roles = [roles]

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"message": "Unauthorized"}), 401
            if roles and user.role not in roles:
                return jsonify({"message": "Forbidden"}), 403
            return fn(user, *args, **kwargs)
        return wrapper
    return decorator
