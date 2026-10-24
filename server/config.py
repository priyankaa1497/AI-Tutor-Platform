import os
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# Load .env from server/ directory and workspace root
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))

class Config:
    SECRET_KEY = os.getenv("AUTH_SECRET", "learnai-dev-secret-change-me-for-production-use-32bytes")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

    # Database configuration
    # Supports PostgreSQL; falls back gracefully to SQLite if not provided
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL or DATABASE_URL.strip() in ("", "sqlite:///learnai.db"):
        DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'learnai.db')}"
    elif DATABASE_URL.startswith("sqlite:///") and not os.path.isabs(DATABASE_URL[10:]):
        rel_path = DATABASE_URL[10:]
        DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, rel_path)}"
    elif DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # AI & Services
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

    AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
    AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "LearnAI")
    AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "")

    AZURE_SPEECH_TO_TEXT_ENDPOINT = os.getenv("AZURE_SPEECH_TO_TEXT_ENDPOINT", "")
    AZURE_SPEECH_TO_TEXT_API_KEY = os.getenv("AZURE_SPEECH_TO_TEXT_API_KEY", "")

    AZURE_TEXT_TO_SPEECH_ENDPOINT = os.getenv("AZURE_TEXT_TO_SPEECH_ENDPOINT", "")
    AZURE_TEXT_TO_SPEECH_API_KEY = os.getenv("AZURE_TEXT_TO_SPEECH_API_KEY", "")


    D_ID_API_KEY = os.getenv("D_ID_API_KEY", "")
    CLOUDINARY_URL = os.getenv("CLOUDINARY_URL", "")

    # Mail configuration
    MAIL_FROM_ADDRESS = os.getenv("MAIL_FROM_ADDRESS", "hello@learnai.local")
    MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "LearnAI")
    MAIL_HOST = os.getenv("MAIL_HOST", "")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    APP_DEBUG = os.getenv("APP_DEBUG", "true").lower() in ("true", "1")
