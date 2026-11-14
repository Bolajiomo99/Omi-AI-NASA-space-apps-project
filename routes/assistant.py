
from flask import Blueprint, jsonify, request

from services.ai_service import answer_question

assistant_bp = Blueprint(
    "assistant",
    __name__
)


@assistant_bp.route("/chat", methods=["POST"])
def chat():

    data = request.get_json(silent=True) or {}

    question = data.get(
        "question",
        ""
    ).strip()

    if not question:
        return jsonify({
            "error": "Please enter a question."
        }), 400

    try:
        answer = answer_question(
            question,
            data.get("analysis_context")
        )

        return jsonify({
            "answer": answer
        })

    except NotImplementedError as error:

        return jsonify({
            "error": str(error)
        }), 501
