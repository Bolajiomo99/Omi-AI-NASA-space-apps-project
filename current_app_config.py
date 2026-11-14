from flask import current_app

def get_region_config(region_id):
    region = current_app.config["REGIONS"].get(region_id)
    if not region:
        raise ValueError("Unknown region. Use 'lagos' or 'edo'.")
    return region
