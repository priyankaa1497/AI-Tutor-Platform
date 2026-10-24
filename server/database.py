from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

Base = declarative_base()
engine = None
db_session = None

def init_db(app):
    global engine, db_session
    engine = create_engine(
        app.config["SQLALCHEMY_DATABASE_URI"],
        pool_pre_ping=True,
        echo=False
    )
    db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
    Base.query = db_session.query_property()

    # Import models to register them on Base
    from . import models

    Base.metadata.create_all(bind=engine)

    # Safe migration for existing SQLite databases
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            res = conn.execute(text("PRAGMA table_info(quizzes)")).fetchall()
            existing_cols = {row[1] for row in res}
            if "quiz_type" not in existing_cols:
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN quiz_type VARCHAR(32) DEFAULT 'quiz'"))
            if "duration_minutes" not in existing_cols:
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN duration_minutes INTEGER DEFAULT 15"))
            if "total_marks" not in existing_cols:
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN total_marks INTEGER DEFAULT 100"))
            if "pass_percentage" not in existing_cols:
                conn.execute(text("ALTER TABLE quizzes ADD COLUMN pass_percentage INTEGER DEFAULT 50"))
            conn.commit()
    except Exception:
        pass

    return db_session

def get_db():
    return db_session
