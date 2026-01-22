from dataclasses import Field
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

    MONGO_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "lyra"
    JWT_SECRET: str = "CHANGE_ME"
    JWT_ALGORITHM: str = "HS256"
    MAILJET_API_KEY: Optional[str] = None
    MAILJET_SECRET_KEY: Optional[str] = None
    MAILJET_FROM_EMAIL: Optional[str] = None
    MAILJET_FROM_NAME: str = "Lyra"

settings = Settings()

print("[CONFIG DEBUG] Mailjet settings loaded:")
print(f"  API_KEY present: {bool(settings.MAILJET_API_KEY)}")
print(f"  SECRET_KEY present: {bool(settings.MAILJET_SECRET_KEY)}")
print(f"  FROM_EMAIL: {settings.MAILJET_FROM_EMAIL}")
print(f"  FROM_NAME: {settings.MAILJET_FROM_NAME}")
