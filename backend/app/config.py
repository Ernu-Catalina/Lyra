from dataclasses import Field
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
import os
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

    # use explicit IPv4 address to avoid IPv6/localhost resolution issues
    MONGO_URL = os.getenv("mongodb+srv://lyra_user:<pLyycc68nM7hfpTr>@lyra.hzghps6.mongodb.net/?appName=Lyra")
    DB_NAME: str = "lyra"
    JWT_SECRET: str = "CHANGE_ME"
    JWT_ALGORITHM: str = "HS256"

settings = Settings()
