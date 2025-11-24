const form = document.getElementById("credit-form");
const btn = document.getElementById("submit-btn");
const resultBox = document.getElementById("result");
const statusPill = document.getElementById("status-pill");
const statusText = document.getElementById("status-text");
const probValue = document.getElementById("prob-value");
const liveRisk = document.getElementById("live-risk");

const gaugeWrapper = document.querySelector(".gauge-wrapper");
const gaugeArc = document.getElementById("gauge-arc");
const gaugeNeedle = document.getElementById("gauge-needle");
const gaugeValue = document.getElementById("gauge-value");
const gaugeLabel = document.getElementById("gauge-label");

const sampleGoodBtn = document.getElementById("sample-good");
const sampleBadBtn = document.getElementById("sample-bad");

const ageEl = document.getElementById("age");
const incomeEl = document.getElementById("income");
const openAccEl = document.getElementById("num_open_accounts");
const lateEl = document.getElementById("late_30_59");
const utilEl = document.getElementById("credit_utilization");

let currentPct = 0;   // remember last shown percentage
const ARC_LENGTH = 251.2;

// ---------- helpers ----------

function setInputs(values) {
    ageEl.value = values.age;
    incomeEl.value = values.income;
    openAccEl.value = values.num_open_accounts;
    lateEl.value = values.late_30_59;
    utilEl.value = values.credit_utilization;
    updateLiveRiskHint();
}

sampleGoodBtn.addEventListener("click", () => {
    setInputs({
        age: 35,
        income: 70000,
        num_open_accounts: 4,
        late_30_59: 0,
        credit_utilization: 28
    });
});

sampleBadBtn.addEventListener("click", () => {
    setInputs({
        age: 22,
        income: 18000,
        num_open_accounts: 9,
        late_30_59: 5,
        credit_utilization: 88
    });
});

function validateInputs() {
    let valid = true;
    const inputs = [ageEl, incomeEl, openAccEl, lateEl, utilEl];

    inputs.forEach(input => input.classList.remove("error"));

    if (!ageEl.value || ageEl.value < 18 || ageEl.value > 100) {
        ageEl.classList.add("error");
        valid = false;
    }
    if (!incomeEl.value || incomeEl.value < 0) {
        incomeEl.classList.add("error");
        valid = false;
    }
    if (openAccEl.value < 0) {
        openAccEl.classList.add("error");
        valid = false;
    }
    if (lateEl.value < 0) {
        lateEl.classList.add("error");
        valid = false;
    }
    if (utilEl.value < 0 || utilEl.value > 150) {
        utilEl.classList.add("error");
        valid = false;
    }

    return valid;
}

// set gauge instantly for a given percentage (0–100)
function setGaugeInstant(pct) {
    const clamped = Math.max(0, Math.min(100, pct));
    const angle = -90 + (clamped / 100) * 180;   // -90° to +90°
    gaugeNeedle.setAttribute("transform", `rotate(${angle} 100 100)`);

    const filled = (clamped / 100) * ARC_LENGTH;
    gaugeArc.setAttribute("stroke-dasharray", `${filled} ${ARC_LENGTH}`);
}

// animate from currentPct to targetPct
function animateGaugeTo(targetPct) {
    const startPct = currentPct;
    const endPct = Math.max(0, Math.min(100, targetPct));
    const duration = 700;
    const startTime = performance.now();

    function frame(now) {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);      // ease-out
        const value = startPct + (endPct - startPct) * eased;

        setGaugeInstant(value);

        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            currentPct = endPct;
        }
    }

    requestAnimationFrame(frame);
}

function startLoadingAnimation() {
    gaugeWrapper.classList.add("gauge-loading");
    gaugeLabel.textContent = "Calculating score...";
}

function stopLoadingAnimation() {
    gaugeWrapper.classList.remove("gauge-loading");
}

// ---------- UI updates ----------

function updateResultUI(label, probGood) {
    resultBox.style.display = "block";

    const percentage = (probGood * 100).toFixed(1);
    const pctNum = Number(percentage);

    probValue.textContent = percentage + "%";
    gaugeValue.textContent = percentage + "%";

    statusPill.classList.remove("good", "bad");
    if (label === "Good") {
        statusPill.classList.add("good");
        statusText.textContent = "Predicted: Good credit profile";
        gaugeLabel.textContent = "Likely good borrower";
    } else {
        statusPill.classList.add("bad");
        statusText.textContent = "Predicted: High credit risk";
        gaugeLabel.textContent = "High risk borrower";
    }

    // smooth animation of needle + arc
    animateGaugeTo(pctNum);
}

function resetGaugeWithError(message) {
    resultBox.style.display = "block";
    statusPill.className = "score-pill bad";
    statusText.textContent = message;
    probValue.textContent = "--";
    gaugeValue.textContent = "--";
    gaugeLabel.textContent = "Error";
    currentPct = 0;
    setGaugeInstant(0);
}

function updateLiveRiskHint() {
    const income = Number(incomeEl.value || 0);
    const util = Number(utilEl.value || 0);
    const late = Number(lateEl.value || 0);

    if (!income && !util && !late) {
        liveRisk.style.display = "none";
        return;
    }

    let riskScore = 0;

    if (income < 25000) riskScore += 2;
    else if (income < 50000) riskScore += 1;

    if (util > 80) riskScore += 2;
    else if (util > 50) riskScore += 1;

    if (late >= 3) riskScore += 2;
    else if (late >= 1) riskScore += 1;

    let text;
    if (riskScore <= 1) {
        text = "Live estimate: profile looks relatively low risk.";
    } else if (riskScore <= 3) {
        text = "Live estimate: moderate risk – consider reducing utilization / late payments.";
    } else {
        text = "Live estimate: high risk signals detected (low income / high utilization / many late payments).";
    }

    liveRisk.textContent = text;
    liveRisk.style.display = "block";
}

[incomeEl, utilEl, lateEl].forEach(el => {
    el.addEventListener("input", updateLiveRiskHint);
});


form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateInputs()) {
        resultBox.style.display = "none";
        return;
    }

    btn.disabled = true;
    btn.textContent = "Predicting…";
    startLoadingAnimation();

    const payload = {
        age: ageEl.value,
        income: incomeEl.value,
        num_open_accounts: openAccEl.value,
        late_30_59: lateEl.value,
        credit_utilization: utilEl.value
    };

    try {
        const res = await fetch("/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            resetGaugeWithError("Error while predicting");
            if (data.error) probValue.textContent = data.error;
        } else {
            updateResultUI(data.credit_label, data.probability_good);
        }
    } catch (err) {
        resetGaugeWithError("Network error");
        probValue.textContent = "Check backend & reload.";
    } finally {
        stopLoadingAnimation();
        btn.disabled = false;
        btn.textContent = "Predict";
    }
});
