from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.routes import auth, projects, documents, users
from app import database
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="Lyra API", redirect_slashes=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://lyra-writing.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(users.router, prefix="/api")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    safe_errors = [
        {
            "loc": e["loc"],
            "msg": e["msg"],
            "type": e["type"],
            "ctx": {k: str(v) for k, v in e.get("ctx", {}).items()} if "ctx" in e else None,
        }
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": safe_errors},
    )

@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request, exc):
    safe_errors = []
    for error in exc.errors():
        safe_error = error.copy()
        if "ctx" in safe_error and isinstance(safe_error["ctx"], dict) and "error" in safe_error["ctx"]:
            safe_error["ctx"]["error"] = str(safe_error["ctx"]["error"])
        safe_errors.append(safe_error)

    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": safe_errors},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.on_event("startup")
async def verify_db_connection():
    """Ping MongoDB on application startup and raise if unavailable."""
    try:
        # motor AsyncIOMotorClient allows using .command with "ping"
        await database.db.command("ping")
        await database.create_indexes()
        logger.info("MongoDB connection successful")
    except Exception as exc:
        logger.error("MongoDB connection failed during startup: %s", exc)
        # fail fast so the service does not run with no database
        raise
