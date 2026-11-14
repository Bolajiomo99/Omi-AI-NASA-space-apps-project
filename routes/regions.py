
from flask import Blueprint, jsonify

regions_bp = Blueprint(
    "regions",
    __name__
)


@regions_bp.route("/regions", methods=["GET"])
def get_regions():

    return jsonify([
        {
            "id": "lagos",
            "name": "Lagos State"
        },
        {
            "id": "edo",
            "name": "Edo State"
        }
    ])


@regions_bp.route("/variables", methods=["GET"])
def get_variables():

    return jsonify([
        {
            "id": "temperature",
            "name": "Temperature",
            "unit": "°C"
        },
        {
            "id": "rainfall",
            "name": "Rainfall",
            "unit": "mm"
        }
    ])
