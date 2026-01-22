from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Annotated

class RegisterRequest(BaseModel):
    name: Annotated[
        str,
        Field(
            min_length=1,
            max_length=100,
            description="Full name of the user",
            examples=["Cataly Smith"]
        )
    ]

    email: EmailStr = Field(
        ...,
        description="User's email address (will be used as unique login identifier)",
        examples=["cataly@example.com"]
    )

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="User's password (must contain at least one letter and one number)",
        examples=["SecurePass123"]
    )

    @field_validator("name", mode="before")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        name_stripped = v.strip()
        if not name_stripped:
            raise ValueError("Name cannot be empty or only whitespace")
        return name_stripped

    @field_validator("password", mode="before")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        # Optional: add more rules (uppercase, special chars, etc.)
        return v

    class Config:
        # Optional: extra example for Swagger/OpenAPI docs
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
