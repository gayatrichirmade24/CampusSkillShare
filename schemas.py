from typing import List

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    college: str = Field(min_length=2, max_length=200)
    branch: str = Field(min_length=2, max_length=100)
    year: int = Field(ge=1, le=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    bio: str = Field(default="", max_length=280)
    skillsOffered: List[str] = []
    skillsWanted: List[str] = []
    projectInterests: List[str] = []
    availability: str = "Flexible"


class SwipeRequest(BaseModel):
    toUserId: int
    liked: bool


class MessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=2000)