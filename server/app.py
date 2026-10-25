import os
from flask import Flask, jsonify
from flask_cors import CORS
from .config import Config
from .database import init_db, get_db

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for frontend Vite development server & production
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize SQL Database
    with app.app_context():
        db = init_db(app)
        try:
            from .seeds import ensure_seeded
            ensure_seeded(db)
        except Exception as e:
            print(f"[INIT SEED ERROR] {e}")

    # Register blueprints under /api prefix
    from .routes.auth_routes import auth_bp
    from .routes.board_routes import board_bp
    from .routes.student_routes import student_bp
    from .routes.teacher_routes import teacher_bp
    from .routes.chat_routes import chat_bp
    from .routes.quiz_routes import quiz_bp

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(board_bp, url_prefix="/api")
    app.register_blueprint(student_bp, url_prefix="/api")
    app.register_blueprint(teacher_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(quiz_bp, url_prefix="/api")

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db = get_db()
        if db:
            db.remove()

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "healthy", "service": "LearnAI Flask Backend", "stack": ["react", "sql", "python", "flask"]})

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
