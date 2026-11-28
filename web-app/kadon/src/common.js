export const CONFIG = {
    SENSOR_DEVICE_NAME: 'Wireless G-Force Monitor',
    SERVICE_UUID: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
    CHARACTERISTIC_UUID: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
    SERIAL_BAUD_RATE: 9600,
    SAMPLE_INTERVAL_MS: 10,
    GRAVITY: 9.81,
};

export function createInitialTestStats() {
    return {
        totalSamples: 0,
        validErrorSamples: 0,
        sumPctError: 0,
        sumDeltaG: 0,
        minPctError: null,
        maxPctError: null,
        avgPctError: null,
        avgDeltaG: null,
    };
}

export const state = {
    testRigEnabled: false,
    sensorConnected: false,
    rigConnected: false,
    sampleRateHz: null,
    currentRigRpm: 0,
    targetRigRpm: 0,

    // Graph pause & timeline state
    isGraphPaused: false,
    pausedAtMs: null,
    timelineZeroMs: Date.now(),
    peakG: 0,

    // Verification test recording state
    isRecording: false,
    recordedRows: [],
    testStats: createInitialTestStats(),
};

export const els = {
    // Mode toggle
    testRigToggle: document.getElementById('testRigToggle'),

    // Sensor controls & readouts
    sensorStatus: document.getElementById('sensorStatus'),
    connectSensorBtn: document.getElementById('connectSensorBtn'),
    pauseGraphBtn: document.getElementById('pauseGraphBtn'),
    resetGraphBtn: document.getElementById('resetGraphBtn'),
    measG: document.getElementById('measG'),
    measMs2: document.getElementById('measMs2'),
    peakG: document.getElementById('peakG'),

    // Rig & verification controls
    rigControlPanel: document.getElementById('rigControlPanel'),
    rigDataGroup: document.getElementById('rigDataGroup'),
    rigStatus: document.getElementById('rigStatus'),
    connectRigBtn: document.getElementById('connectRigBtn'),
    radiusInput: document.getElementById('radiusInput'),
    targetRpmInput: document.getElementById('targetRpmInput'),
    sendRpmBtn: document.getElementById('sendRpmBtn'),
    rpmSendFeedback: document.getElementById('rpmSendFeedback'),
    startRecBtn: document.getElementById('startRecBtn'),
    stopRecBtn: document.getElementById('stopRecBtn'),
    clearTestBtn: document.getElementById('clearTestBtn'),

    // Verification telemetry cards
    expG: document.getElementById('expG'),
    expMs2: document.getElementById('expMs2'),
    liveRpm: document.getElementById('liveRpm'),
    errPct: document.getElementById('errPct'),
    deltaG: document.getElementById('deltaG'),
    avgErrPct: document.getElementById('avgErrPct'),
    avgDeltaG: document.getElementById('avgDeltaG'),
    elapsedTime: document.getElementById('elapsedTime'),

    // Charts & summary pills
    primaryChartTitle: document.getElementById('primaryChartTitle'),
    errorChartPanel: document.getElementById('errorChartPanel'),
    resultsTablePanel: document.getElementById('resultsTablePanel'),
    validationChartCanvas: document.getElementById('validationChart'),
    errorChartCanvas: document.getElementById('errorChart'),
    summaryMeanErr: document.getElementById('summaryMeanErr'),
    summaryMeanDelta: document.getElementById('summaryMeanDelta'),
    summaryMinMaxErr: document.getElementById('summaryMinMaxErr'),
    summaryValidCount: document.getElementById('summaryValidCount'),

    // Accumulated test table
    tableRowCount: document.getElementById('tableRowCount'),
    tableScrollContainer: document.getElementById('tableScrollContainer'),
    recordedTableBody: document.getElementById('recordedTableBody'),
};
