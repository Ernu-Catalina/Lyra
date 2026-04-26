from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

    MONGO_URL: str = Field(..., alias="MONGO_URL")
    DB_NAME: str = "lyra"
    JWT_SECRET: str = "CHANGE_ME"
    JWT_ALGORITHM: str = "HS256"

settings = Settings()