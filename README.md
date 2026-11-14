# Omi AI — Earth System Trend Detective

Omi AI is an environmental intelligence platform
for investigating historical environmental changes.

## Initial study scope

Regions:
- Lagos State, Nigeria
- Edo State, Nigeria

Variables:
- Temperature
- Rainfall

## Technology stack

- Python
- Flask
- Pandas
- NumPy
- SciPy
- PyMannKendall
- Plotly
- HTML
- CSS
- JavaScript

## Installation

Create a virtual environment:

python -m venv venv

Activate it on Windows:

.\venv\Scripts\Activate.ps1

Install dependencies:

pip install -r requirements.txt

Create your environment file:

Copy-Item .env.example .env

Run the application:

python app.py

Open:

http://127.0.0.1:5000

## Run tests

pytest

## Important

NASA data retrieval and AI integration are not
connected in this starter implementation.

Confirm the NASA data product, endpoint,
authentication and spatial extraction method
before implementing data retrieval.
