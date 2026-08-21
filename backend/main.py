from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.core.startup import load_all_models
from backend.api import fault, terrashield, gis, explain, complaints, switching, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if not settings.USE_MOCK_DATA:
        app.state.inference = load_all_models()
    yield
    # Shutdown — cleanup here if needed


app = FastAPI(title="GridSentinel API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fault.router,       prefix="/api")
app.include_router(terrashield.router, prefix="/api")
app.include_router(gis.router,         prefix="/api")
app.include_router(explain.router,     prefix="/api")
app.include_router(complaints.router,  prefix="/api")
app.include_router(switching.router,   prefix="/api")
app.include_router(ws.router,          prefix="/api")


@app.get("/health")
async def health():
    loaded = hasattr(app.state, "inference") or settings.USE_MOCK_DATA
    return {
        "status":        "ok",
        "models_loaded": loaded,
        "mock_mode":     settings.USE_MOCK_DATA,
    }
