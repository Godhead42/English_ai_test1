"""English Pronunciation Agent — FastAPI entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, get_db, Base, SessionLocal
from models import User
from auth import hash_password

from routers import analyze, analyze_demo, phrases, tts, chat, auth_routes, progress, admin

app = FastAPI(title="English Pronunciation Agent API")

# ── CORS ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include routers ──────────────────────────────
app.include_router(analyze.router)
app.include_router(analyze_demo.router)
app.include_router(phrases.router)
app.include_router(tts.router)
app.include_router(chat.router)
app.include_router(auth_routes.router)
app.include_router(progress.router)
app.include_router(admin.router)


# ── Startup ──────────────────────────────────────
from sqlalchemy import text

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created / verified")

    db = SessionLocal()
    try:
        # Seamless schema migration for prod: add is_admin if users table already existed
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP"))
            db.commit()
        except Exception:
            db.rollback()

        admin = db.query(User).filter(User.email == "admin@kstu.kz").first()
        if not admin:
            admin = User(
                email="admin@kstu.kz",
                name="Admin",
                hashed_password=hash_password("admin123"),
                level="C1",
                is_admin=True,
            )
            db.add(admin)
            db.commit()
            print("✅ Admin user created: admin@kstu.kz / admin123")
        else:
            # Ensure existing admin has admin flag
            if not admin.is_admin:
                admin.is_admin = True
                db.commit()
                print("✅ Admin user promoted to is_admin=True")
            else:
                print("✅ Admin user already exists")
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "Backend is running!"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
