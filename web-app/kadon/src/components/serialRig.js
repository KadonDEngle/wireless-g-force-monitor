import { CONFIG, els } from '../common.js';

export function initSerialRig({ onRpmReceived, onConnectionChange }) {
    let port = null;
    let reader = null;
    let readableStreamClosed = null;
    let writeChain = Promise.resolve();

    function setDisconnectedUI() {
        port = null;
        reader = null;
        readableStreamClosed = null;
        els.rigStatus.textContent = 'Disconnected';
        els.rigStatus.classList.remove('connected');
        els.connectRigBtn.textContent = 'Connect Rig (USB)';
        els.connectRigBtn.classList.remove('secondary');
        els.connectRigBtn.classList.add('rig-btn');
        els.connectRigBtn.disabled = false;
        els.sendRpmBtn.disabled = true;
        els.sendRpmBtn.title = 'Connect USB test rig to send speed';
        if (onConnectionChange) onConnectionChange(false);
    }

    async function disconnectRig() {
        els.connectRigBtn.disabled = true;
        try {
            if (reader) {
                await reader.cancel();
                await readableStreamClosed.catch(() => {}); // Ignore expected stream abort error
            }
            if (port) {
                await port.close();
            }
        } catch (err) {
            console.error('Rig Disconnect Error:', err);
        } finally {
            setDisconnectedUI();
        }
    }

    function sendRpm(rpm) {
        if (!port || !port.writable) {
            return Promise.resolve(false);
        }

        const command = `${Number(rpm)}\n`;
        const task = writeChain.then(async () => {
            if (!port || !port.writable) return false;
            const writer = port.writable.getWriter();
            try {
                const payload = new TextEncoder().encode(command);
                await writer.write(payload);
                return true;
            } finally {
                writer.releaseLock();
            }
        });

        // Keep writeChain settled so future writes are not blocked by a transient error
        writeChain = task.catch(() => false);
        return task;
    }

    els.connectRigBtn.addEventListener('click', async () => {
        if (!('serial' in navigator)) {
            alert('Web Serial is not supported in this browser. Use Chrome or Edge.');
            return;
        }

        // Disconnect if already connected
        if (port) {
            await disconnectRig();
            return;
        }

        try {
            els.connectRigBtn.disabled = true;
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: CONFIG.SERIAL_BAUD_RATE });

            els.rigStatus.textContent = 'Connected';
            els.rigStatus.classList.add('connected');
            els.connectRigBtn.textContent = 'Disconnect Rig';
            els.connectRigBtn.classList.remove('rig-btn');
            els.connectRigBtn.classList.add('secondary');
            els.connectRigBtn.disabled = false;
            els.sendRpmBtn.disabled = false;
            els.sendRpmBtn.title = 'Send target RPM to the USB test rig';

            if (onConnectionChange) onConnectionChange(true);

            const textDecoder = new TextDecoderStream();
            readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
            reader = textDecoder.readable.getReader();

            let serialLineBuffer = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                serialLineBuffer += value;

                const lines = serialLineBuffer.split('\n');
                serialLineBuffer = lines.pop();

                for (const line of lines) {
                    const parsedRpm = parseFloat(line.trim());
                    if (!isNaN(parsedRpm) && onRpmReceived) {
                        onRpmReceived(parsedRpm);
                    }
                }
            }
        } catch (err) {
            console.error('Rig Serial Error:', err);
        } finally {
            if (port) {
                await disconnectRig();
            } else {
                setDisconnectedUI();
            }
        }
    });

    return {
        sendRpm,
        isConnected: () => Boolean(port),
    };
}
