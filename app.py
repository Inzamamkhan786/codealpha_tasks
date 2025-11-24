from flask import Flask, render_template, request, jsonify
import numpy as np
import joblib
import os

app = Flask(__name__)

MODEL_PATH = os.path.join("models", "credit_model_real.pkl")
model = joblib.load(MODEL_PATH)   

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json() or request.form

    try:
        age = float(data.get("age", 0))
        income = float(data.get("income", 0))
        num_open_accounts = float(data.get("num_open_accounts", 0))
        late_30_59 = float(data.get("late_30_59", 0))
        credit_util_percent = float(data.get("credit_utilization", 0))
    except ValueError:
        return jsonify({"error": "Invalid input"}), 400

    # Convert utilization from % to 0–1 scale as in dataset
    revolving_util = credit_util_percent / 100.0

    # Feature order must match feature_cols in training script
    features = np.array([[
        age,
        income,
        num_open_accounts,
        late_30_59,
        revolving_util
    ]])

    # model outputs prob of default (bad)
    proba_bad = float(model.predict_proba(features)[0, 1])
    proba_good = 1.0 - proba_bad
    label = "Good" if proba_good >= 0.5 else "Bad"

    return jsonify({
        "probability_good": round(proba_good, 3),
        "credit_label": label
    })

if __name__ == "__main__":
    app.run(debug=True)
