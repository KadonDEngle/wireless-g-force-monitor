import { els } from '../common.js';

let validationChart = null;
let errorChart = null;
let meanErrorLineValue = null;
let showRigExpected = false;

// Draws an O(1) horizontal dashed reference line across the full extent of the error chart
const meanErrorLinePlugin = {
    id: 'meanErrorLine',
    afterDatasetsDraw(chart) {
        if (meanErrorLineValue === null || !Number.isFinite(meanErrorLineValue)) return;

        const { ctx, chartArea, scales } = chart;
        const yScale = scales.y;
        if (!yScale || !chartArea) return;

        const yPos = yScale.getPixelForValue(meanErrorLineValue);
        if (yPos < chartArea.top || yPos > chartArea.bottom) return;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#facc15';
        ctx.moveTo(chartArea.left, yPos);
        ctx.lineTo(chartArea.right, yPos);
        ctx.stroke();

        const label = `Test Avg: ${meanErrorLineValue.toFixed(2)}%`;
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textWidth = ctx.measureText(label).width;
        const pillW = textWidth + 14;
        const pillH = 20;
        const pillX = chartArea.right - pillW - 8;
        const pillY = Math.max(chartArea.top + 4, yPos - pillH - 4);

        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(23, 27, 33, 0.92)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, pillX + 7, pillY + pillH / 2);
        ctx.restore();
    },
};

export function initVerificationCharts() {
    const valCtx = els.validationChartCanvas.getContext('2d');
    validationChart = new Chart(valCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Sensor Measured (G)',
                    data: [],
                    borderColor: '#d73f09',
                    backgroundColor: 'rgba(215, 63, 9, 0.12)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.15,
                    fill: true,
                },
                {
                    label: 'Rig Expected (G)',
                    data: [],
                    borderColor: '#38bdf8',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    tension: 0.1,
                    fill: false,
                    hidden: !showRigExpected,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    ticks: { color: '#9aa5b1', maxTicksLimit: 12 },
                    grid: { color: '#2c313a' },
                    title: { display: true, text: 'Elapsed Time (seconds)', color: '#9aa5b1' },
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 4.0,
                    ticks: { color: '#9aa5b1' },
                    grid: { color: '#2c313a' },
                    title: { display: true, text: 'Centripetal Acceleration (G)', color: '#9aa5b1' },
                },
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e4e7eb',
                        filter: (legendItem) => legendItem.datasetIndex === 0 || showRigExpected,
                    },
                },
            },
        },
    });

    const errCtx = els.errorChartCanvas.getContext('2d');
    errorChart = new Chart(errCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Instantaneous Error (%)',
                    data: [],
                    borderColor: 'rgba(248, 113, 113, 0.55)',
                    backgroundColor: 'rgba(248, 113, 113, 0.08)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.1,
                    spanGaps: false,
                    fill: true,
                },
                {
                    label: 'Running Average Error (%)',
                    data: [],
                    borderColor: '#38bdf8',
                    borderWidth: 2.5,
                    pointRadius: 0,
                    tension: 0.15,
                    spanGaps: true,
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    ticks: { color: '#9aa5b1', maxTicksLimit: 12 },
                    grid: { color: '#2c313a' },
                    title: { display: true, text: 'Test Elapsed Time (seconds)', color: '#9aa5b1' },
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 15,
                    ticks: {
                        color: '#9aa5b1',
                        callback: (value) => `${value}%`,
                    },
                    grid: { color: '#2c313a' },
                    title: { display: true, text: 'Percent Error (%)', color: '#9aa5b1' },
                },
            },
            plugins: {
                legend: { labels: { color: '#e4e7eb' } },
            },
        },
        plugins: [meanErrorLinePlugin],
    });
}

// Keep full extent (no rolling window) on the primary chart
export function appendValidationPoint(timeLabel, measuredG, expectedG) {
    if (!validationChart) return;
    validationChart.data.labels.push(timeLabel);
    validationChart.data.datasets[0].data.push(measuredG);
    validationChart.data.datasets[1].data.push(expectedG);
}

export function appendErrorPoint(timeLabel, instPctError, runningAvgPctError, overallAvgPctError) {
    if (!errorChart) return;
    errorChart.data.labels.push(timeLabel);
    errorChart.data.datasets[0].data.push(instPctError);
    errorChart.data.datasets[1].data.push(runningAvgPctError);
    meanErrorLineValue = overallAvgPctError;
}

export function clearValidationChart() {
    if (!validationChart) return;
    validationChart.data.labels = [];
    validationChart.data.datasets[0].data = [];
    validationChart.data.datasets[1].data = [];
    validationChart.update('none');
}

export function clearErrorChart() {
    meanErrorLineValue = null;
    if (!errorChart) return;
    errorChart.data.labels = [];
    errorChart.data.datasets[0].data = [];
    errorChart.data.datasets[1].data = [];
    errorChart.update('none');
}

export function setRigExpectedVisible(visible) {
    showRigExpected = Boolean(visible);
    if (!validationChart) return;
    validationChart.data.datasets[1].hidden = !showRigExpected;
    validationChart.update('none');
}

export function updateVerificationCharts() {
    if (validationChart) validationChart.update('none');
    if (errorChart) errorChart.update('none');
}
