let bluetooth_options = {
    filters: [
        {services: ["4fafc201-1fb5-459e-8fcc-c5c9c331914b"]}
    ]
}

const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const decoder = new TextDecoder(); // Defaults to 'utf-8'
const encoder = new TextEncoder();

let actualRpm = 0.0;
let currTime = prevTime = Date.now()
let sampleRates = []
const sampleLimit = 10
const mountRadiusCM = 14

async function connect_Port() {
    const port = await navigator.serial.requestPort()
    await port.open({ baudRate: 115200 });
    await port.setSignals({ dataTerminalReady: true, requestToSend: false });
    console.log(port)

    const port_decoder = new TextDecoderStream();
    const reader = port_decoder.readable.getReader();
    const rawReader = await port.readable.getReader();
    let buffer = ""
    while (true) {
        try {
            while(true) {
                const { value1, done1 } = await rawReader.read();
                console.log(value1)
                const { value, done } = await reader.read();
                if(value) {
                    buffer += value
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); 
                    
                    for (const line of lines) {
                        const cleanLine = line.trim();
                        if (cleanLine) {
                            actualRpm = Number(cleanLine).toFixed(2)
                        }
                    }
                }
                if (done) {
                    console.log("HERE")
                    reader.releaseLock();              
                    break;
                }
            }
        } catch (error) {
            console.log(error)
        } finally {
            reader.releaseLock();
        }
    }
}


// document.addEventListener("DOMContentLoaded", init);

// function init() {
//     console.log("HTML loaded");
//     document.getElementById("rpmEntryBox").addEventListener('input', )
// }

function connect_BLE() {
    console.log("BLE FUNC CALLED")
    navigator.bluetooth.requestDevice(bluetooth_options)
    .then((device) => {
        return device.gatt.connect();
    })
    .then((server) => {
        return server.getPrimaryService(SERVICE_UUID);
    })
    .then((service) => {
        return service.getCharacteristic(CHARACTERISTIC_UUID);
    })
    .then((characteristic) => {
        console.log(characteristic)
        document.getElementsByClassName("cssButton").hidden = true
        characteristic.addEventListener('characteristicvaluechanged', sensorValueChanged)
        characteristic.startNotifications();
    })
    .catch((error) => {
        console.log("Connection error");
    })
}

function sensorValueChanged(event) {
    prevTime = currTime
    currTime = Date.now()
    const data = event.target.value
    const sensorData = decoder.decode(data);

    let values = sensorData.split(",")
    values.pop()

    updateSensorValues(values)
}

function updateSensorValues(data) {
    // Update expected g-force
    const expectedGforce = calculateGfromRPM(actualRpm)
    document.getElementById("gForceCalculation").textContent = String(expectedGforce) + " G"
   
    // Update measured g-force
    let averageGforce = data.reduce((a, b) => Number(a) + Number(b), 0) / data.length;
    averageGforce = Number.parseFloat(averageGforce).toFixed(2)
    document.getElementById("gForceReading").textContent = String(averageGforce) + " G";

    // Update sample rate
    const sampleRate = calculateSampleRate(prevTime, currTime, data.length)
    document.getElementById("sampleRateReading").textContent = String(sampleRate) + " Hz"
    
    // Update actual RPM
    document.getElementById("rpmReading").textContent = String(actualRpm) + " RPM"
}

async function updateRpm() {
    const newRpm = document.getElementById("rpmEntryBox").value
        // Get a writer from the port's writable stream
        // const writer = port.writable.getWriter();
        
        // // Encode the string into a Uint8Array
        // const data = encoder.encode(String(newRpm) + "\n");

        // try {
        //     await writer.write(data);
        //     console.log("Wrote new value of " + String(newRpm) + " RPM")
        // } finally {
        //     // Always release the lock so other functions can write later
        //     writer.releaseLock();
        // }
}


function calculateSampleRate(previousDataTimestamp, currentDataTimestamp, numSamples) {
    // console.log(String(previousDataTimestamp) + " -- " + String(currentDataTimestamp) + " -- " + String(numSamples) )
    const sampleRate = (currentDataTimestamp - previousDataTimestamp) / numSamples
    const sampleFreq = 1000.0 / sampleRate
    
    sampleRates.push(sampleFreq)
    sampleRates.length > sampleLimit ? sampleRates.shift() : null
    
    const averageSampleRate = sampleRates.reduce((a, b) => a + b, 0) / sampleRates.length
    return Number.parseFloat(averageSampleRate).toFixed(2)
}

function calculateGfromRPM(rpm) {
    let calculatedGforce = (1.118 * 10**-5) * mountRadiusCM * rpm**2
    return Number.parseFloat(calculatedGforce).toFixed(2)
}
// TODO:

// Calculate sample rate from timestamp of received data, display
// Calculate error in sensor readings and display

// Send via serial: RPM (floating point terminated with \n)
// Receive via serial: RPM
// Calculate G-force and display