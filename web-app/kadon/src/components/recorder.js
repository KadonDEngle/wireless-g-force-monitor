import { state, els, createInitialTestStats } from '../common.js';
import { getErrorClass, updateErrorSummaryDisplay } from './telemetry.js';

function renderEmptyTableState() {
    els.recordedTableBody.innerHTML =
        '<tr id="emptyTableRow"><td colspan="9" class="empty-state">Press "Start Test" to accumulate verification samples.</td></tr>';
    els.tableRowCount.textContent = '0 samples';
}

function createTableCell(text, className = '') {
    const td = document.createElement('td');
    td.textContent = text;
    if (className) td.className = className;
    return td;
}

export function initRecorder({ onRecordingStart, onRecordingStop, onTestCleared }) {
    els.startRecBtn.addEventListener('click', () => {
        if (onRecordingStart) onRecordingStart();

        state.isRecording = true;
        state.recordedRows = [];
        state.testStats = createInitialTestStats();
        state.timelineZeroMs = Date.now();

        els.recordedTableBody.innerHTML = '';
        els.tableRowCount.textContent = '0 samples';
        els.elapsedTime.textContent = '0.00';
        updateErrorSummaryDisplay();

        els.startRecBtn.disabled = true;
        els.startRecBtn.classList.add('record-active');
        els.startRecBtn.textContent = 'Recording...';
        els.stopRecBtn.disabled = false;
        els.clearTestBtn.disabled = true;
    });

    els.stopRecBtn.addEventListener('click', () => {
        state.isRecording = false;
        els.startRecBtn.disabled = false;
        els.startRecBtn.classList.remove('record-active');
        els.startRecBtn.textContent = 'Start Test';
        els.stopRecBtn.disabled = true;
        els.clearTestBtn.disabled = state.recordedRows.length === 0;

        if (state.recordedRows.length === 0) {
            renderEmptyTableState();
        }

        if (onRecordingStop) onRecordingStop();
    });

    els.clearTestBtn.addEventListener('click', () => {
        if (state.isRecording) return;
        state.recordedRows = [];
        state.testStats = createInitialTestStats();
        state.timelineZeroMs = Date.now();
        if (state.isGraphPaused) {
            state.pausedAtMs = state.timelineZeroMs;
        }

        renderEmptyTableState();
        updateErrorSummaryDisplay();

        els.elapsedTime.textContent = '0.00';
        els.clearTestBtn.disabled = true;

        if (onTestCleared) onTestCleared();
    });
}

export function logSample({ timeSec, rpm, radiusMm, expectedG, measuredG, deltaG, pctError }) {
    if (!state.isRecording) return null;

    const stats = state.testStats;
    stats.totalSamples += 1;
    stats.sumDeltaG += deltaG;
    stats.avgDeltaG = stats.sumDeltaG / stats.totalSamples;

    if (pctError !== null && Number.isFinite(pctError)) {
        stats.validErrorSamples += 1;
        stats.sumPctError += pctError;
        stats.avgPctError = stats.sumPctError / stats.validErrorSamples;
        stats.minPctError = stats.minPctError === null ? pctError : Math.min(stats.minPctError, pctError);
        stats.maxPctError = stats.maxPctError === null ? pctError : Math.max(stats.maxPctError, pctError);
    }

    const row = {
        index: stats.totalSamples,
        timeSec,
        rpm,
        radiusMm,
        expectedG,
        measuredG,
        deltaG,
        pctError,
        runningAvgPctError: stats.avgPctError,
    };

    state.recordedRows.push(row);
    return row;
}

export function appendRecordedTableRows(rows) {
    if (!rows || rows.length === 0) return;

    const emptyRow = document.getElementById('emptyTableRow');
    if (emptyRow) emptyRow.remove();

    const container = els.tableScrollContainer;
    const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 36;

    const fragment = document.createDocumentFragment();
    for (const r of rows) {
        const tr = document.createElement('tr');
        tr.appendChild(createTableCell(String(r.index)));
        tr.appendChild(createTableCell(r.timeSec.toFixed(3)));
        tr.appendChild(createTableCell(r.rpm.toFixed(1)));
        tr.appendChild(createTableCell(r.radiusMm.toFixed(1)));
        tr.appendChild(createTableCell(r.expectedG.toFixed(3)));
        tr.appendChild(createTableCell(r.measuredG.toFixed(3)));
        tr.appendChild(createTableCell(r.deltaG.toFixed(3)));

        const errText = r.pctError !== null ? `${r.pctError.toFixed(2)}%` : 'N/A';
        tr.appendChild(createTableCell(errText, getErrorClass(r.pctError)));

        const avgText = r.runningAvgPctError !== null ? `${r.runningAvgPctError.toFixed(2)}%` : '--';
        tr.appendChild(createTableCell(avgText, getErrorClass(r.runningAvgPctError)));

        fragment.appendChild(tr);
    }

    els.recordedTableBody.appendChild(fragment);
    els.tableRowCount.textContent = `${state.recordedRows.length.toLocaleString()} samples`;

    if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
    }
}
