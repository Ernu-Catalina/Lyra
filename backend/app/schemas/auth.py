from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Annotated, List

class UserSettings(BaseModel):
    theme: str = Field(default="light", description="light | dark | system")
    wordcount_display: List[str] = Field(
        default=["document"],
        description="chapter, scene, document — any combination"
    )
    wordcount_format: str = Field(
        default="exact",
        description="exact | rounded | abbreviated"
    )
    default_view: str = Field(
        default="document",
        description="chapter | scene | document"
    )

class RegisterRequest(BaseModel):
    name: Annotated[
        str,
        Field(min_length=1, max_length=100, description="Full name of the user")
    ]
    email: EmailStr = Field(
        ...,
        description="User's email address (must be valid and unique)",
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="User's password (must contain at least one letter and one number)"
    )

    @field_validator("name", mode="before")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        name_stripped = v.strip()
        if not name_stripped:
            raise ValueError("Name cannot be empty or only whitespace")
        return name_stripped

    @field_validator("email", mode="before")
    @classmethod
    def normalize_and_validate_email(cls, v: str) -> str:
        email = v.strip().lower()
        if not email:
            raise ValueError("Email cannot be empty")
        # EmailStr already validates format, but we can add extra check if desired
        return email

    @field_validator("password", mode="before")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Cataly Smith",
                "email": "cataly@example.com",
                "password": "SecurePass123"
            }
        }
class AuthRequest(BaseModel):
    email: EmailStr
    password: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, description="6-digit reset code")
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="New password (must contain at least one letter and one number)"
    )

    @field_validator("new_password", mode="before")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str
