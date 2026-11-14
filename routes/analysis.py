
from flask import Blueprint, jsonify, request

from services.analysis_service import (
    analyze_series,
    compare_regions
)

analysis_bp = Blueprint(
    "analysis",
    __name__
)


@analysis_bp.route("/trend", methods=["POST"])
def trend_analysis():

    data = request.get_json(silent=True) or {}

    try:
        result = analyze_series(
            data["dates"],
            data["values"]
        )

        return jsonify(result)

    except (KeyError, TypeError, ValueError) as error:

        return jsonify({
            "error": str(error)
        }), 400


@analysis_bp.route("/compare", methods=["POST"])
def regional_comparison():

    data = request.get_json(silent=True) or {}

    try:
        result = compare_regions(
            data["region_a"],
            data["region_b"]
        )

        return jsonify(result)

    except (KeyError, TypeError, ValueError) as error:

        return jsonify({
            "error": str(error)
        }), 400
