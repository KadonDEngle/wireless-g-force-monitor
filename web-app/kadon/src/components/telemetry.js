import { CONFIG, state, els } from '../common.js';
import { computeExpectedG, computeError } from './physics.js';

export function getErrorClass(pctError) {
    if (pctError === null || !Number.isFinite(pctError)) return '';
    if (pctError < 5) return 'err-good';
    if (pctError < 10) return 'err-warn';
    return 'err-bad';
}

export function updateExpectedDisplay() {
    const radiusMm = parseFloat(els.radiusInput.value) || 0;
    const expected = computeExpectedG(state.currentRigRpm, radiusMm);

    els.expG.textContent = expected.gForce.toFixed(2);
    els.expMs2.textContent = expected.accelMs2.toFixed(2);
    els.liveRpm.textContent = state.currentRigRpm.toFixed(0);
}

export function updateErrorSummaryDisplay() {
    const stats = state.testStats;

    if (stats.avgPctError !== null) {
        els.avgErrPct.textContent = `${stats.avgPctError.toFixed(2)}%`;
        els.avgErrPct.className = getErrorClass(stats.avgPctError);
        els.summaryMeanErr.textContent = `${stats.avgPctError.toFixed(2)}%`;
        els.summaryMinMaxErr.textContent = `${stats.minPctError.toFixed(2)}% / ${stats.maxPctError.toFixed(2)}%`;
    } else {
        els.avgErrPct.textContent = '--';
        els.avgErrPct.className = '';
        els.summaryMeanErr.textContent = '--';
        els.summaryMinMaxErr.textContent = '--';
    }

    if (stats.avgDeltaG !== null) {
        els.avgDeltaG.textContent = stats.avgDeltaG.toFixed(3);
        els.summaryMeanDelta.textContent = `${stats.avgDeltaG.toFixed(3)} G`;
    } else {
        els.avgDeltaG.textContent = '--';
        els.summaryMeanDelta.textContent = '--';
    }

    els.summaryValidCount.textContent = stats.validErrorSamples.toLocaleString();
}

export function updateSampleRateDisplay(hz) {
    state.sampleRateHz = hz !== null && Number.isFinite(hz) ? hz : null;
    if (state.sensorConnected && !state.isGraphPaused) {
        els.sensorStatus.textContent =
            state.sampleRateHz !== null ? `Connected • ${Math.round(state.sampleRateHz)} Hz` : 'Connected';
    }
}

export function resetSensorReadouts() {
    els.measG.textContent = '0.00';
    els.measMs2.textContent = '0.00';
    els.peakG.textContent = '0.00';
    els.errPct.textContent = '--';
    els.errPct.className = '';
    els.deltaG.textContent = '0.000';
    if (!state.isRecording && state.recordedRows.length === 0) {
        els.elapsedTime.textContent = '0.00';
    }
    updateSampleRateDisplay(null);
}

export function updateLiveTelemetry(latestMeasG, expectedG, elapsedSec) {
    els.measG.textContent = latestMeasG.toFixed(2);
    els.measMs2.textContent = (latestMeasG * CONFIG.GRAVITY).toFixed(2);
    els.peakG.textContent = state.peakG.toFixed(2);

    if (state.isRecording) {
        els.elapsedTime.textContent = elapsedSec.toFixed(2);
    }

    updateExpectedDisplay();

    const { deltaG, pctError } = computeError(latestMeasG, expectedG);
    els.deltaG.textContent = deltaG.toFixed(3);

    if (pctError !== null) {
        els.errPct.textContent = `${pctError.toFixed(1)}%`;
        els.errPct.className = getErrorClass(pctError);
    } else {
        els.errPct.textContent = '--';
        els.errPct.className = '';
    }

    updateErrorSummaryDisplay();
}
