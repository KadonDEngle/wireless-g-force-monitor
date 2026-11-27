import { CONFIG, state, els } from './common.js';
import { computeExpectedG, computeError } from './components/physics.js';
import {
    initVerificationCharts,
    appendValidationPoint,
    appendErrorPoint,
    clearValidationChart,
    clearErrorChart,
    setRigExpectedVisible,
    updateVerificationCharts,
} from './components/chart.js';
import {
    updateExpectedDisplay,
    updateLiveTelemetry,
    updateSampleRateDisplay,
    resetSensorReadouts,
} from './components/telemetry.js';
import { initBleSensor } from './components/bleSensor.js';
import { initSerialRig } from './components/serialRig.js';
import { initRecorder, logSample, appendRecordedTableRows } from './components/recorder.js';

// --- Initialize Charts & Initial Display ---
initVerificationCharts();
updateExpectedDisplay();

// --- Test Rig Mode Toggle ---
function setTestRigEnabled(enabled) {
    const active = Boolean(enabled);
    state.testRigEnabled = active;
    els.testRigToggle.checked = active;

    if (!active && state.isRecording) {
        els.stopRecBtn.click();
        if (state.isGraphPaused) {
            setGraphPaused(false);
        }
    }

    document.body.classList.toggle('rig-disabled', !active);
    els.connectRigBtn.classList.toggle('hidden', !active);
    els.rigControlPanel.classList.toggle('hidden', !active);
    els.rigDataGroup.classList.toggle('hidden', !active);
    els.errorChartPanel.classList.toggle('hidden', !active);
    els.resultsTablePanel.classList.toggle('hidden', !active);

    els.primaryChartTitle.textContent = active
        ? 'Sensor Acceleration vs. Rig Expected'
        : 'Sensor Acceleration';

    setRigExpectedVisible(active);
}

els.testRigToggle.addEventListener('change', () => {
    setTestRigEnabled(els.testRigToggle.checked);
});

setTestRigEnabled(state.testRigEnabled);

// --- Sliding-Window Sensor Sample Rate Tracker ---
const RATE_WINDOW_MS = 2000;
let recentBatches = [];

function resetSampleRateTracker() {
    recentBatches = [];
    updateSampleRateDisplay(null);
}

function recordPacketRate(sampleCount, arrivalMs) {
    recentBatches.push({ timeMs: arrivalMs, count: sampleCount });
    const cutoff = arrivalMs - RATE_WINDOW_MS;
    while (recentBatches.length > 2 && recentBatches[0].timeMs < cutoff) {
        recentBatches.shift();
    }

    if (recentBatches.length < 2) return null;
    const spanMs = arrivalMs - recentBatches[0].timeMs;
    if (spanMs < 250) return null;

    // Exclude the initial reference batch count to avoid fencepost overestimation
    let samplesAfterFirst = 0;
    for (let i = 1; i < recentBatches.length; i += 1) {
        samplesAfterFirst += recentBatches[i].count;
    }
    return samplesAfterFirst / (spanMs / 1000.0);
}

// --- Graph Pause / Resume & Reset Controls ---
function setGraphPaused(paused) {
    if (paused === state.isGraphPaused) return;

    if (paused) {
        state.isGraphPaused = true;
        state.pausedAtMs = Date.now();
        els.pauseGraphBtn.textContent = 'Resume Graph';
        els.pauseGraphBtn.classList.add('paused-active');
        els.sensorStatus.textContent = state.sensorConnected ? 'Paused' : 'Disconnected';
        els.sensorStatus.classList.toggle('paused', state.sensorConnected);
        els.sensorStatus.classList.remove('connected');
        resetSampleRateTracker();
    } else {
        const now = Date.now();
        if (state.pausedAtMs !== null) {
            state.timelineZeroMs += now - state.pausedAtMs;
        }
        state.isGraphPaused = false;
        state.pausedAtMs = null;
        els.pauseGraphBtn.textContent = 'Pause Graph';
        els.pauseGraphBtn.classList.remove('paused-active');
        els.sensorStatus.classList.remove('paused');
        if (state.sensorConnected) {
            els.sensorStatus.textContent = 'Connected';
            els.sensorStatus.classList.add('connected');
        }
        resetSampleRateTracker();
    }
}

els.pauseGraphBtn.addEventListener('click', () => {
    setGraphPaused(!state.isGraphPaused);
});

els.resetGraphBtn.addEventListener('click', () => {
    const now = Date.now();
    state.timelineZeroMs = now;
    if (state.isGraphPaused) {
        state.pausedAtMs = now;
    }
    state.peakG = 0;
    resetSampleRateTracker();
    clearValidationChart();
    resetSensorReadouts();
});

// --- Verification Inputs & Serial Rig Speed Control ---
function setRpmFeedback(message, tone = '') {
    els.rpmSendFeedback.textContent = message;
    els.rpmSendFeedback.className = tone ? `rpm-feedback ${tone}` : 'rpm-feedback';
}

els.radiusInput.addEventListener('input', updateExpectedDisplay);

els.targetRpmInput.addEventListener('input', () => {
    const parsed = parseFloat(els.targetRpmInput.value);
    const rpm = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    state.targetRigRpm = rpm;

    if (!state.rigConnected) {
        state.currentRigRpm = rpm;
        updateExpectedDisplay();
    }
});

const serialRig = initSerialRig({
    onConnectionChange: (connected) => {
        state.rigConnected = connected;
        if (connected) {
            setRpmFeedback('USB connected. Set RPM and press Send Speed.', 'sent');
        } else {
            const parsed = parseFloat(els.targetRpmInput.value);
            state.currentRigRpm = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
            updateExpectedDisplay();
            setRpmFeedback('Manual RPM preview (USB disconnected)');
        }
    },
    onRpmReceived: (parsedRpm) => {
        state.currentRigRpm = parsedRpm;
        updateExpectedDisplay();
    },
});

async function handleSendRpm() {
    const parsed = parseFloat(els.targetRpmInput.value);
    const rpm = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    els.targetRpmInput.value = String(rpm);
    state.targetRigRpm = rpm;

    if (!serialRig.isConnected()) {
        setRpmFeedback('Connect USB test rig first to send speed.', 'warn');
        return;
    }

    els.sendRpmBtn.disabled = true;
    try {
        const sent = await serialRig.sendRpm(rpm);
        if (sent) {
            state.currentRigRpm = rpm;
            updateExpectedDisplay();
            setRpmFeedback(`Sent ${rpm} RPM to rig`, 'sent');
        } else {
            setRpmFeedback('Failed to write speed to rig.', 'warn');
        }
    } catch (err) {
        console.error('Failed to send RPM:', err);
        setRpmFeedback('Error sending speed over USB.', 'warn');
    } finally {
        els.sendRpmBtn.disabled = !serialRig.isConnected();
    }
}

els.sendRpmBtn.addEventListener('click', handleSendRpm);
els.targetRpmInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && serialRig.isConnected()) {
        event.preventDefault();
        handleSendRpm();
    }
});

// --- Initialize Verification Recorder ---
initRecorder({
    onRecordingStart: () => {
        if (state.isGraphPaused) {
            setGraphPaused(false);
        }
        clearValidationChart();
        clearErrorChart();
    },
    onRecordingStop: () => {
        setGraphPaused(true);
    },
    onTestCleared: () => {
        clearValidationChart();
        clearErrorChart();
    },
});

// --- Initialize BLE Sensor ---
initBleSensor({
    onConnected: () => {
        state.sensorConnected = true;
        if (!state.isRecording) {
            state.timelineZeroMs = Date.now();
        }
        resetSampleRateTracker();
        if (state.isGraphPaused) {
            els.sensorStatus.textContent = 'Paused';
            els.sensorStatus.classList.remove('connected');
            els.sensorStatus.classList.add('paused');
        }
    },
    onDisconnected: () => {
        state.sensorConnected = false;
        els.sensorStatus.classList.remove('paused');
        resetSampleRateTracker();
    },
    onValuesReceived: handleSensorValues,
});

// --- Main Data Pipeline ---
function handleSensorValues(values) {
    // When paused, stop collecting data and stop reporting measured results / error
    if (state.isGraphPaused) return;

    const arrivalMs = Date.now();
    const rateHz = recordPacketRate(values.length, arrivalMs);
    if (rateHz !== null) {
        updateSampleRateDisplay(rateHz);
    }

    const radiusMm = parseFloat(els.radiusInput.value) || 0;
    const expected = state.testRigEnabled
        ? computeExpectedG(state.currentRigRpm, radiusMm)
        : { gForce: null };
    const newlyRecordedRows = [];

    values.forEach((measuredG, idx) => {
        if (measuredG > state.peakG) {
            state.peakG = measuredG;
        }

        const offsetFromArrivalMs = (values.length - 1 - idx) * CONFIG.SAMPLE_INTERVAL_MS;
        const sampleElapsedSec = Math.max(0, (arrivalMs - offsetFromArrivalMs - state.timelineZeroMs) / 1000.0);
        const timeLabel = `${sampleElapsedSec.toFixed(2)}s`;

        appendValidationPoint(timeLabel, measuredG, expected.gForce);

        if (state.testRigEnabled && state.isRecording) {
            const { deltaG, pctError } = computeError(measuredG, expected.gForce);
            const row = logSample({
                timeSec: sampleElapsedSec,
                rpm: state.currentRigRpm,
                radiusMm,
                expectedG: expected.gForce,
                measuredG,
                deltaG,
                pctError,
            });

            if (row) {
                newlyRecordedRows.push(row);
                appendErrorPoint(timeLabel, pctError, row.runningAvgPctError, state.testStats.avgPctError);
            }
        }
    });

    if (newlyRecordedRows.length > 0) {
        appendRecordedTableRows(newlyRecordedRows);
    }

    const latestMeasG = values[values.length - 1];
    const latestElapsedSec = Math.max(0, (arrivalMs - state.timelineZeroMs) / 1000.0);

    updateLiveTelemetry(latestMeasG, state.testRigEnabled ? expected.gForce : 0, latestElapsedSec);
    updateVerificationCharts();
}
