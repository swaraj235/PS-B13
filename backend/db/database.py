import sqlite3
import os
from datetime import datetime, timezone
from backend.core.security import hash_password

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "gridsentinel.db")

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'consumer',
        zone_id INTEGER DEFAULT 1,
        phone TEXT,
        avatar_data TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Create complaints table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        email TEXT,
        consumer_name TEXT,
        section_id INTEGER NOT NULL,
        area_name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Outage / Power Cut',
        description TEXT,
        image_data TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        submitted_at TEXT NOT NULL,
        resolved_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)

    # Create audit_logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        performed_by TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    """)

    conn.commit()

    # Auto-migrations for existing tables
    cursor.execute("PRAGMA table_info(users)")
    user_cols = [col[1] for col in cursor.fetchall()]
    if "avatar_data" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar_data TEXT")

    cursor.execute("PRAGMA table_info(complaints)")
    complaint_cols = [col[1] for col in cursor.fetchall()]
    if "image_data" not in complaint_cols:
        cursor.execute("ALTER TABLE complaints ADD COLUMN image_data TEXT")
    if "impact_count" not in complaint_cols:
        cursor.execute("ALTER TABLE complaints ADD COLUMN impact_count INTEGER DEFAULT 1")

    conn.commit()

    # Ensure default demo accounts exist
    now = datetime.now(timezone.utc).isoformat()
    admin_pass = hash_password("admin123")
    user_pass  = hash_password("user123")

    cursor.execute("""
    INSERT OR IGNORE INTO users (email, password_hash, full_name, role, zone_id, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("admin@msedcl.in", admin_pass, "MSEDCL Chief Engineer", "admin", 1, "+91 98765 43210", now))

    cursor.execute("""
    INSERT OR IGNORE INTO users (email, password_hash, full_name, role, zone_id, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("consumer@pune.in", user_pass, "Rajesh Kumar (Kothrud Resident)", "consumer", 1, "+91 91234 56789", now))

    conn.commit()
    conn.close()



def log_audit_event(conn, complaint_id: int | None, action: str, details: str, performed_by: str):
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    INSERT INTO audit_logs (complaint_id, action, details, performed_by, timestamp)
    VALUES (?, ?, ?, ?, ?)
    """, (complaint_id, action, details, performed_by, now))
    conn.commit()

