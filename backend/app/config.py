from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    
    MONGO_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "lyra"
    JWT_SECRET: str = "CHANGE_ME"
    JWT_ALGORITHM: str = "HS256"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""

settings = Settings()