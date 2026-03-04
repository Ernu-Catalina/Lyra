from dataclasses import Field
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

    # use explicit IPv4 address to avoid IPv6/localhost resolution issues
    MONGO_URI: str = "mongodb://127.0.0.1:27017"
    DB_NAME: str = "lyra"
    JWT_SECRET: str = "CHANGE_ME"
    JWT_ALGORITHM: str = "HS256"
    MAILJET_API_KEY: Optional[str] = None
    MAILJET_SECRET_KEY: Optional[str] = None
    MAILJET_FROM_EMAIL: Optional[str] = None
    MAILJET_FROM_NAME: str = "Lyra"

settings = Settings()
