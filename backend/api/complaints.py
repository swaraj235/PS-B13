from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel
from datetime import datetime, timezone
import io
import csv
from backend.db.database import get_db_connection, log_audit_event
from backend.core.security import decode_access_token

router = APIRouter(tags=["complaints"])

# Map common Pune area names -> feeder section
VILLAGE_SECTION_MAP = {
    # Section 1 — Kothrud / Karve feeder
    "kothrud": 1, "warje": 1, "karve nagar": 1, "erandwane": 1,
    # Section 2 — Paud / Bavdhan feeder
    "paud": 2, "bhugaon": 2, "bavdhan": 2, "bavdhan khurd": 2, "ideal colony": 2,
    # Section 3 — Kondhwa / Undri / NIBM feeder
    "kondhwa": 3, "kondhwa budruk": 3, "kondhwa khurd": 3, "undri": 3, "pisoli": 3, "nibm": 3, "nibm rd": 3,
    # Section 4 — Hadapsar / Magarpatta feeder
    "hadapsar": 4, "magarpatta": 4, "amanora": 4, "mundhwa": 4,
    # Section 5 — Swargate / Camp feeder
    "swargate": 5, "camp": 5, "parvati": 5, "shivajinagar": 5,
}

class CreateComplaintSchema(BaseModel):
    village: str
    category: str = "Outage / Power Cut"
    description: str | None = None
    section_id: int | None = None
    image_data: str | None = None

class StatusUpdateSchema(BaseModel):
    status: str # "pending", "in_progress", "resolved"

class CSVItem(BaseModel):
    area_name: str
    category: str = "Outage / Power Cut"
    description: str | None = None
    section_id: int | None = None
    consumer_name: str | None = "Consumer"
    email: str | None = "csv_import@msedcl.in"

class CSVImportSchema(BaseModel):
    items: list[CSVItem]

@router.post("/complaints")
async def submit_complaint(body: CreateComplaintSchema, authorization: str | None = Header(None)):
    user_id = None
    consumer_name = "Consumer"
    email = "anonymous@pune.in"

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            email = payload["sub"]
            user_id = payload.get("user_id")
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT full_name FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            if row:
                consumer_name = row["full_name"]
            conn.close()

    village = (body.village or "Unknown Area").strip()
    section_id = body.section_id or 3
    vl = village.lower()
    for key, sec in VILLAGE_SECTION_MAP.items():
        if key in vl or vl in key:
            section_id = sec
            break

    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if an active complaint (pending or in_progress) already exists for this feeder section or user
    cursor.execute("""
    SELECT * FROM complaints 
    WHERE section_id = ? AND status IN ('pending', 'in_progress')
    ORDER BY id DESC LIMIT 1
    """, (section_id,))
    active_complaint = cursor.fetchone()

    if active_complaint:
        # Merge duplicate report into existing active ticket & elevate impact count
        existing_id = active_complaint["id"]
        current_impact = active_complaint["impact_count"] if "impact_count" in active_complaint.keys() and active_complaint["impact_count"] else 1
        new_impact = current_impact + 1

        cursor.execute("UPDATE complaints SET impact_count = ? WHERE id = ?", (new_impact, existing_id))

        log_audit_event(
            conn,
            complaint_id=existing_id,
            action="OUTAGE_ENDORSED",
            details=f"Resident {consumer_name} ({email}) endorsed active Ticket #{existing_id} for Section {section_id} ({village}). Total impact count: {new_impact}",
            performed_by=f"{consumer_name} ({email})"
        )

        conn.commit()
        cursor.execute("SELECT * FROM complaints WHERE id = ?", (existing_id,))
        row = cursor.fetchone()
        conn.close()

        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "email": row["email"],
            "consumer_name": row["consumer_name"],
            "section_id": row["section_id"],
            "village": row["area_name"],
            "category": row["category"],
            "description": row["description"],
            "image_data": row["image_data"] if "image_data" in row.keys() else None,
            "status": row["status"],
            "impact_count": new_impact,
            "duplicate_merged": True,
            "message": f"An active outage ticket (#{existing_id}) is already being handled for Section {section_id}! Your report has been merged to elevate priority.",
            "acknowledged": row["status"] != "pending",
            "submitted_at": row["submitted_at"],
        }

    # Otherwise, insert new complaint
    cursor.execute("""
    INSERT INTO complaints (user_id, email, consumer_name, section_id, area_name, category, description, image_data, status, impact_count, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    """, (user_id, email, consumer_name, section_id, village, body.category, body.description, body.image_data, "pending", now))
    
    complaint_id = cursor.lastrowid

    # Record audit log event
    log_audit_event(
        conn, 
        complaint_id=complaint_id, 
        action="COMPLAINT_RAISED", 
        details=f"New complaint reported for {village} ({body.category})", 
        performed_by=f"{consumer_name} ({email})"
    )

    conn.commit()

    cursor.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    row = cursor.fetchone()
    conn.close()

    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "email": row["email"],
        "consumer_name": row["consumer_name"],
        "section_id": row["section_id"],
        "village": row["area_name"],
        "category": row["category"],
        "description": row["description"],
        "image_data": row["image_data"] if "image_data" in row.keys() else None,
        "status": row["status"],
        "impact_count": 1,
        "duplicate_merged": False,
        "acknowledged": row["status"] != "pending",
        "submitted_at": row["submitted_at"],
    }


@router.post("/complaints/{complaint_id}/endorse")
async def endorse_complaint(complaint_id: int, authorization: str | None = Header(None)):
    consumer_name = "Resident"
    email = "anonymous@pune.in"

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            email = payload["sub"]
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT full_name FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            if row:
                consumer_name = row["full_name"]
            conn.close()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Complaint not found")

    current_impact = row["impact_count"] if "impact_count" in row.keys() and row["impact_count"] else 1
    new_impact = current_impact + 1

    cursor.execute("UPDATE complaints SET impact_count = ? WHERE id = ?", (new_impact, complaint_id))

    log_audit_event(
        conn,
        complaint_id=complaint_id,
        action="OUTAGE_ENDORSED",
        details=f"Resident {consumer_name} ({email}) endorsed Ticket #{complaint_id}. Impact elevated to {new_impact} residents.",
        performed_by=f"{consumer_name} ({email})"
    )

    conn.commit()
    conn.close()
    return {"status": "success", "id": complaint_id, "impact_count": new_impact}



@router.patch("/complaints/{complaint_id}/acknowledge")
async def acknowledge_complaint(complaint_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE complaints SET status = 'in_progress' WHERE id = ?", (complaint_id,))

    log_audit_event(
        conn,
        complaint_id=complaint_id,
        action="CREW_DISPATCHED",
        details=f"Repair crew dispatched for Ticket #{complaint_id}",
        performed_by="MSEDCL Operator"
    )

    conn.commit()

    cursor.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Complaint not found")

    return {
        "id": row["id"],
        "section_id": row["section_id"],
        "village": row["area_name"],
        "category": row["category"],
        "status": row["status"],
        "acknowledged": True,
        "submitted_at": row["submitted_at"],
    }


@router.patch("/complaints/{complaint_id}/status")
async def update_complaint_status(complaint_id: int, body: StatusUpdateSchema, authorization: str | None = Header(None)):
    if body.status not in ["pending", "in_progress", "resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    operator_name = "MSEDCL Operator"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            operator_name = payload["sub"]

    now = datetime.now(timezone.utc).isoformat() if body.status == "resolved" else None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE complaints SET status = ?, resolved_at = ? WHERE id = ?", (body.status, now, complaint_id))

    action_name = "POWER_RESTORED" if body.status == "resolved" else "CREW_DISPATCHED" if body.status == "in_progress" else "STATUS_RESET"
    details_str = f"Ticket #{complaint_id} status updated to '{body.status}'"
    log_audit_event(conn, complaint_id=complaint_id, action=action_name, details=details_str, performed_by=operator_name)

    conn.commit()

    cursor.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Complaint not found")

    return {
        "id": row["id"],
        "section_id": row["section_id"],
        "village": row["area_name"],
        "status": row["status"],
        "acknowledged": row["status"] != "pending",
        "submitted_at": row["submitted_at"],
        "resolved_at": row["resolved_at"],
    }


@router.post("/complaints/import-csv")
async def import_complaints_csv(body: CSVImportSchema, authorization: str | None = Header(None)):
    operator_name = "MSEDCL Operator"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            operator_name = payload["sub"]

    conn = get_db_connection()
    cursor = conn.cursor()
    imported_count = 0
    now = datetime.now(timezone.utc).isoformat()

    for item in body.items:
        village = (item.area_name or "Unknown Area").strip()
        section_id = item.section_id or 3
        vl = village.lower()
        for key, sec in VILLAGE_SECTION_MAP.items():
            if key in vl or vl in key:
                section_id = sec
                break

        cursor.execute("""
        INSERT INTO complaints (user_id, email, consumer_name, section_id, area_name, category, description, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (None, item.email or "csv@msedcl.in", item.consumer_name or "Batch Import Consumer", section_id, village, item.category or "Outage / Power Cut", item.description or "Bulk CSV Ingestion", "pending", now))
        imported_count += 1

    log_audit_event(
        conn,
        complaint_id=None,
        action="CSV_BULK_IMPORT",
        details=f"Bulk imported {imported_count} complaints into triage queue",
        performed_by=operator_name
    )

    conn.commit()
    conn.close()

    return {"status": "success", "imported": imported_count}


@router.get("/complaints")
async def get_complaints(email: str | None = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    if email:
        cursor.execute("SELECT * FROM complaints WHERE email = ? ORDER BY id DESC", (email,))
    else:
        cursor.execute("SELECT * FROM complaints ORDER BY id DESC")
    
    rows = cursor.fetchall()
    conn.close()

    res = []
    for r in rows:
        res.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "email": r["email"],
            "consumer_name": r["consumer_name"],
            "section_id": r["section_id"],
            "village": r["area_name"],
            "category": r["category"],
            "description": r["description"],
            "image_data": r["image_data"] if "image_data" in r.keys() else None,
            "status": r["status"],
            "impact_count": r["impact_count"] if "impact_count" in r.keys() and r["impact_count"] else 1,
            "acknowledged": r["status"] != "pending",
            "submitted_at": r["submitted_at"],
            "resolved_at": r["resolved_at"],
        })
    return {"complaints": res}


@router.get("/complaints/audit-logs")
async def get_audit_logs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200")
    rows = cursor.fetchall()
    conn.close()

    res = []
    for r in rows:
        res.append({
            "id": r["id"],
            "complaint_id": r["complaint_id"],
            "action": r["action"],
            "details": r["details"],
            "performed_by": r["performed_by"],
            "timestamp": r["timestamp"],
        })
    return {"audit_logs": res}

