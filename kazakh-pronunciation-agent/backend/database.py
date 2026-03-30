import os
import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@db:5432/english_coach")

# Retry connection — PostgreSQL might not be ready when backend starts
import time as _time
for _attempt in range(5):
    try:
        engine = create_engine(DATABASE_URL)
        # Test the connection
        with engine.connect() as conn:
            conn.execute(sqlalchemy.text("SELECT 1"))
        print(f"✅ Database connected on attempt {_attempt + 1}")
        break
    except Exception as e:
        print(f"⏳ DB connection attempt {_attempt + 1}/5 failed: {e}")
        if _attempt < 4:
            _time.sleep(3)
        else:
            print("⚠️ Could not connect to DB, starting anyway (tables will be created on first request)")
            engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
