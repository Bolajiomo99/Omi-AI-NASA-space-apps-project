import os

from flask import Flask, abort, jsonify, render_template, request, send_from_directory, session
from werkzeug.exceptions import HTTPException

from config import Config
from routes import register_blueprints


def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)

    os.makedirs(app.config["CACHE_FOLDER"], exist_ok=True)

    register_blueprints(app)

    if app.config.get("CORS_ORIGINS"):
        from flask_cors import CORS

        CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    @app.context_processor
    def inject_profile():
        # Shown in the sidebar user card on every workspace page.
        return {"current_profile": session.get("profile") or {}}

    @app.route("/")
    def landing():
        return render_template("landing.html")

    @app.route("/dashboard")
    def dashboard():
        return render_template("dashboard.html")

    @app.route("/assistant")
    def assistant():
        return render_template("assistant.html")

    @app.route("/profile")
    def profile():
        return render_template("profile.html", user=session.get("profile"))

    @app.route("/settings")
    def settings():
        return render_template("settings.html")

    @app.route("/upload")
    def upload():
        return render_template("upload.html")

    @app.route("/samples/<path:name>")
    def sample_file(name):
        folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "sample")
        if not name.endswith(".csv"):
            abort(404)
        return send_from_directory(folder, name, as_attachment=True)

    @app.route("/health")
    def health():
        return {
            "status": "ok",
            "application": "Omi AI",
            "ai_model": "gemini" if app.config.get("GOOGLE_API_KEY") else "built-in",
        }

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        # API callers always get JSON, never an HTML error page.
        if request.path.startswith("/api/"):
            return jsonify({"error": error.description or error.name}), error.code
        return error

    @app.errorhandler(Exception)
    def handle_unexpected(error):
        if isinstance(error, HTTPException):
            return handle_http_error(error)
        app.logger.exception("Unhandled error")
        if request.path.startswith("/api/"):
            return jsonify({"error": "Unexpected server error. Please try again."}), 500
        return "Internal Server Error", 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=app.config["DEBUG"],
    )
