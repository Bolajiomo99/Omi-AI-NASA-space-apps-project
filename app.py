from flask import Flask, render_template
from config import Config
from routes import register_blueprints


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    register_blueprints(app)

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
        return render_template("profile.html")

    @app.route("/settings")
    def settings():
        return render_template("settings.html")

    @app.route("/upload")
    def upload():
        return render_template("upload.html")

    @app.route("/health")
    def health():
        return {"status": "ok", "application": "Omi AI"}

    return app


app = create_app()

if __name__ == "__main__":
    app.run(
        debug=app.config["DEBUG"]
    )
