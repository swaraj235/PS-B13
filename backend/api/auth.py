from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
from backend.db.database import get_db_connection
from backend.core.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "consumer" # "consumer" or "admin"
    zone_id: int = 1
    phone: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    zone_id: int
    phone: str | None = None
    avatar_data: str | None = None

class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    zone_id: int | None = None
    avatar_data: str | None = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

def get_current_user_from_header(authorization: str | None = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    email = payload["sub"].lower()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, full_name, role, zone_id, phone, avatar_data FROM users WHERE email = ?", (email,))
    user_row = cursor.fetchone()

    if not user_row:
        # Auto-provision user record if token is valid but row doesn't exist yet
        now = datetime.now(timezone.utc).isoformat()
        role = payload.get("role", "consumer")
        pass_hash = hash_password("user123")
        full_name = "Utility Consumer" if role == "consumer" else "MSEDCL Admin"
        cursor.execute("""
        INSERT INTO users (email, password_hash, full_name, role, zone_id, phone, created_at)
        VALUES (?, ?, ?, ?, 1, '', ?)
        """, (email, pass_hash, full_name, role, now))
        conn.commit()

        cursor.execute("SELECT id, email, full_name, role, zone_id, phone, avatar_data FROM users WHERE email = ?", (email,))
        user_row = cursor.fetchone()

    conn.close()
    return dict(user_row)



@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check existing user
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email.lower(),))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    now = datetime.now(timezone.utc).isoformat()
    pass_hash = hash_password(req.password)
    role = req.role if req.role in ["consumer", "admin"] else "consumer"

    cursor.execute("""
    INSERT INTO users (email, password_hash, full_name, role, zone_id, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (req.email.lower(), pass_hash, req.full_name, role, req.zone_id, req.phone, now))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    user_obj = UserResponse(
        id=user_id,
        email=req.email.lower(),
        full_name=req.full_name,
        role=role,
        zone_id=req.zone_id,
        phone=req.phone,
        avatar_data=None,
    )
    token = create_access_token({"sub": req.email.lower(), "role": role, "user_id": user_id})

    return AuthResponse(access_token=token, user=user_obj)


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, email, password_hash, full_name, role, zone_id, phone, avatar_data FROM users WHERE email = ?", (req.email.lower(),))
    user_row = cursor.fetchone()
    conn.close()

    if not user_row or not verify_password(req.password, user_row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_obj = UserResponse(
        id=user_row["id"],
        email=user_row["email"],
        full_name=user_row["full_name"],
        role=user_row["role"],
        zone_id=user_row["zone_id"],
        phone=user_row["phone"],
        avatar_data=user_row["avatar_data"],
    )
    token = create_access_token({"sub": user_row["email"], "role": user_row["role"], "user_id": user_row["id"]})

    return AuthResponse(access_token=token, user=user_obj)


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user_from_header)):
    return UserResponse(**user)


@router.put("/profile", response_model=UserResponse)
async def update_profile(req: ProfileUpdateRequest, current_user: dict = Depends(get_current_user_from_header)):
    conn = get_db_connection()
    cursor = conn.cursor()

    full_name = req.full_name if req.full_name is not None else current_user["full_name"]
    phone = req.phone if req.phone is not None else current_user["phone"]
    zone_id = req.zone_id if req.zone_id is not None else current_user["zone_id"]
    avatar_data = req.avatar_data if req.avatar_data is not None else current_user.get("avatar_data")

    cursor.execute("""
    UPDATE users
    SET full_name = ?, phone = ?, zone_id = ?, avatar_data = ?
    WHERE id = ?
    """, (full_name, phone, zone_id, avatar_data, current_user["id"]))
    
    conn.commit()

    cursor.execute("SELECT id, email, full_name, role, zone_id, phone, avatar_data FROM users WHERE id = ?", (current_user["id"],))
    updated_user = cursor.fetchone()
    conn.close()

    return UserResponse(**dict(updated_user))

