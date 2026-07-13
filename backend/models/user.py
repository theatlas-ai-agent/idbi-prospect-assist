"""User model — stubbed for hackathon demo. ponytail: in-memory, replace with DB."""

import hashlib
import secrets
from datetime import datetime

_users: dict = {}


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_user(full_name, email, phone, password, pan_number=None, aadhaar_number=None):
    if email in _users:
        raise ValueError("Email already registered")
    user = {
        "id": len(_users) + 1,
        "full_name": full_name,
        "email": email.lower(),
        "phone": phone,
        "password_hash": _hash_password(password),
        "pan_number": pan_number,
        "aadhaar_number": aadhaar_number,
        "created_at": datetime.utcnow().isoformat(),
    }
    _users[email] = user
    return user


def authenticate_user(email, password):
    user = _users.get(email.lower())
    if user and user["password_hash"] == _hash_password(password):
        return user
    return None


def generate_token(email):
    return secrets.token_urlsafe(32)


def verify_token(token):
    for user in _users.values():
        if user.get("token") == token:
            return user["email"]
    return None


def get_user_by_email(email):
    return _users.get(email.lower())


def user_to_response(user):
    return {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "phone": user.get("phone", ""),
    }
