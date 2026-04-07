from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SaveResultRequest(BaseModel):
    phrase: str
    level: str
    topic: str = ""
    overall_score: float
    accuracy: float = 0
    fluency: float = 0
    completeness: float = 0
    intonation: float = 0
    stress: float = 0
    issue_count: int = 0
