from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

    MONGO_URL: str = Field(..., alias="MONGO_URL")
    DB_NAME: str = "lyra"
    JWT_SECRET: str = "CHANGE_ME"
    JWT_ALGORITHM: str = "HS256"

    # Access token lifetime (short-lived; refresh tokens extend sessions)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    # Email verification token lifetime
    EMAIL_VERIFY_EXPIRE_HOURS: int = 24

    # Cookie settings — set COOKIE_SECURE=false in .env for local HTTP dev
    COOKIE_SECURE: bool = True
    COOKIE_SAMESITE: str = "none"   # "none" required for cross-origin (Railway)

    # Frontend base URL used in email verification links
    FRONTEND_URL: str = "https://lyra-writing.up.railway.app"

settings = Settings()