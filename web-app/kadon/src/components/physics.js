import { CONFIG } from '../common.js';

export function computeExpectedG(rpm, radiusMm) {
    const radiusM = radiusMm / 1000.0;
    const omega = (2.0 * Math.PI * rpm) / 60.0;
    const accelMs2 = omega * omega * radiusM;

    return {
        radiusM,
        accelMs2,
        gForce: accelMs2 / CONFIG.GRAVITY,
    };
}

export function computeError(measuredG, expectedG) {
    const deltaG = Math.abs(measuredG - expectedG);
    const pctError = expectedG > 0.02 ? (deltaG / expectedG) * 100.0 : null;

    return { deltaG, pctError };
}