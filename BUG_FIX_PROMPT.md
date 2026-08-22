# 🤖 ONE-SHOT BUG FIX PROMPT FOR GRIDSENTINEL

> **Instructions for use**: Copy and paste the prompt block below into an AI assistant / agent session to execute all necessary fixes in one single turn.

---

```markdown
Please apply the following critical and medium fixes across the GridSentinel codebase in a single step:

### 1. Fix "Mark Spam" status 400 error in `backend/api/complaints.py`
- In `backend/api/complaints.py`, find the `update_complaint_status` endpoint and its allowed status validation list `["pending", "in_progress", "resolved"]`.
- Update the allowed statuses array to include `"spam"`: `["pending", "in_progress", "resolved", "spam"]`.
- When status is updated to `"spam"`, ensure `acknowledged` is set to `False` and an audit log event is recorded with action `"COMPLAINT_SPAM_MARKED"`.

### 2. Fix `submitted_by` vs `consumer_name` Mismatch in `frontend/src/pages/ComplaintsTriageView.tsx`
- In `ComplaintsTriageView.tsx`, replace all references to `c.submitted_by` with `(c.consumer_name || c.submitted_by || 'Anonymous Resident')`.
- Ensure the table display, CSV export function, and PDF report export function correctly display `consumer_name`.

### 3. Update Pydantic Schemas in `backend/shared/schemas.py`
- Update `ComplaintRequest` schema to match actual frontend payload:
  ```python
  class ComplaintRequest(BaseModel):
      village: str
      category: str
      description: Optional[str] = None
      section_id: int = Field(..., ge=1, le=5)
      image_data: Optional[str] = None
  ```
- Update `ComplaintResponse` schema to include all fields returned by backend endpoints:
  ```python
  class ComplaintResponse(BaseModel):
      id: int
      section_id: int
      village: str
      category: Optional[str] = "Power Cut"
      description: Optional[str] = None
      image_data: Optional[str] = None
      consumer_name: Optional[str] = "Anonymous Resident"
      email: Optional[str] = None
      submitted_at: datetime
      acknowledged: bool
      status: str = "pending"
      impact_count: Optional[int] = 1
      resolved_at: Optional[datetime] = None
  ```

### 4. Remove Wildcard CORS Security Vulnerability in `backend/main.py`
- In `backend/main.py`, update `CORSMiddleware` configuration:
  - Remove `"*"` from `allow_origins`.
  - Set `allow_origins=[settings.CORS_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"]`.
  - Set `allow_credentials=True`.

### 5. Fix Missing `PyJWT` and Dependencies in `backend/requirements.txt`
- Update `backend/requirements.txt` to contain all explicit dependencies required to run both mock and production ML model inference:
  ```text
  fastapi>=0.100.0
  uvicorn[standard]>=0.22.0
  pydantic>=2.0.0
  pydantic-settings>=2.0.0
  websockets>=11.0.0
  python-multipart>=0.0.6
  PyJWT>=2.8.0
  passlib[bcrypt]>=1.7.4
  numpy>=1.24.0
  pandas>=2.0.0
  torch>=2.0.0
  xgboost>=2.0.0
  joblib>=1.3.0
  scikit-learn>=1.3.0
  shap>=0.42.0
  pyserial>=3.5
  ```

### 6. Reset Field Crew Status When Zone Changes in `frontend/src/pages/CrewView.tsx`
- In `CrewView.tsx`, add an effect or handler when `activeSecId` changes so that `dispatched` is reset to `false` and `crewStatus` is reset to `'EN_ROUTE'`.

### 7. Add `OUTAGE_ENDORSED` Event Filter in `frontend/src/pages/AuditLogView.tsx`
- In `AuditLogView.tsx`, add `'OUTAGE_ENDORSED'` to the filter buttons list alongside `['ALL', 'COMPLAINT_RAISED', 'CREW_DISPATCHED', 'POWER_RESTORED', 'CSV_BULK_IMPORT', 'OUTAGE_ENDORSED']`.
- Provide a purple/teal badge for `OUTAGE_ENDORSED` in `getActionBadge()`.

### 8. Fix `gis_feeder` Mock Flag in `backend/api/gis.py`
- Update `gis_feeder` endpoint in `backend/api/gis.py` to respect `settings.USE_MOCK_DATA` or load dynamically.

Please perform these edits cleanly, maintaining all comments and existing structure.
```
