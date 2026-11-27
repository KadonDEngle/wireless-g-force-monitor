import { CONFIG, els } from '../common.js';

export function initBleSensor({ onConnected, onDisconnected, onValuesReceived }) {
    let connectedDevice = null;

    function setDisconnectedUI() {
        connectedDevice = null;
        els.sensorStatus.textContent = 'Disconnected';
        els.sensorStatus.classList.remove('connected');
        els.connectSensorBtn.textContent = 'Connect Sensor (BLE)';
        els.connectSensorBtn.classList.remove('secondary');
        els.connectSensorBtn.disabled = false;
        if (onDisconnected) onDisconnected();
    }

    els.connectSensorBtn.addEventListener('click', async () => {
        if (connectedDevice?.gatt?.connected) {
            connectedDevice.gatt.disconnect();
            return;
        }

        if (!('bluetooth' in navigator)) {
            alert('Web Bluetooth is not supported in this browser. Use Chrome or Edge.');
            return;
        }

        try {
            els.connectSensorBtn.disabled = true;
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ name: CONFIG.SENSOR_DEVICE_NAME }],
                optionalServices: [CONFIG.SERVICE_UUID],
            });

            device.addEventListener('gattserverdisconnected', setDisconnectedUI);

            els.sensorStatus.textContent = 'Connecting...';
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService(CONFIG.SERVICE_UUID);
            const characteristic = await service.getCharacteristic(CONFIG.CHARACTERISTIC_UUID);

            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
                const decoded = new TextDecoder('utf-8').decode(event.target.value);
                const values = decoded
                    .split(',')
                    .map((v) => parseFloat(v.trim()))
                    .filter((v) => !isNaN(v));

                if (values.length > 0 && onValuesReceived) {
                    onValuesReceived(values);
                }
            });

            connectedDevice = device;
            els.sensorStatus.textContent = 'Connected';
            els.sensorStatus.classList.add('connected');
            els.connectSensorBtn.textContent = 'Disconnect Sensor';
            els.connectSensorBtn.classList.add('secondary');
            els.connectSensorBtn.disabled = false;

            if (onConnected) onConnected();
        } catch (err) {
            console.error('BLE Connection Error:', err);
            setDisconnectedUI();
        }
    });
}
