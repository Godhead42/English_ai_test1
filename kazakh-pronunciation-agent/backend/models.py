from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    level = Column(String, default="A1")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    results = relationship("PronunciationResult", back_populates="user")


class PronunciationResult(Base):
    __tablename__ = "pronunciation_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    phrase = Column(String, nullable=False)
    level = Column(String, nullable=False)
    overall_score = Column(Float, nullable=False)
    accuracy = Column(Float, default=0)
    fluency = Column(Float, default=0)
    completeness = Column(Float, default=0)
    issue_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="results")
