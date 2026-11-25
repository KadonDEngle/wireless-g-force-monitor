#include <Arduino.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <NimBLEDevice.h>


Adafruit_MPU6050 mpu;


// NimBLE variables
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

NimBLEServer* pServer = nullptr;
NimBLEService* pService = nullptr;
NimBLECharacteristic* pCharacteristic = nullptr;
NimBLEAdvertising* pAdvertising = nullptr;
bool deviceConnected = false;

// NimBLE server callback functions
class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override {
        deviceConnected = true;
        Serial.println("Client connected");
    }

    void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
        deviceConnected = false;
        Serial.printf("Client disconnected - start advertising\n");
        NimBLEDevice::startAdvertising();
    }
};


// Data buffer variables
String dataBuffer = "";
int readingCount = 0;
const int BUFFER_SIZE = 10;
const int SAMPLE_DELAY = 5;


void setup() {
    Serial.begin(115200);
    while (!Serial) delay(10);

    // Try to initialize the MPU6050 sensor
    if (!mpu.begin()) {
        Serial.println("Failed to find MPU6050 chip");
        while (1) {
            delay(10);
        }
    }
    Serial.println("MPU6050 Found!");

    // Set MPU6050 acceleration range to +-4G
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    // Set MPU6050 filter bandwidth to 10Hz to filter out high frequency noise
    mpu.setFilterBandwidth(MPU6050_BAND_10_HZ);

    // Pre-allocate memory for data buffer
    dataBuffer.reserve(256);

    // NimBLE setup
    NimBLEDevice::init("Wireless G-Force Monitor");
    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks);

    pService = pServer->createService(SERVICE_UUID);
    pCharacteristic = pService->createCharacteristic(CHARACTERISTIC_UUID, NIMBLE_PROPERTY::NOTIFY);

    pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    
    // Put device name in scan response to avoid exceeding the 31-byte primary advertising packet limit
    NimBLEAdvertisementData scanResponseData;
    scanResponseData.setName("Wireless G-Force Monitor");
    pAdvertising->setScanResponseData(scanResponseData);
    // pAdvertising->setName("Wireless G-Force Monitor");
    pAdvertising->enableScanResponse(true);

    pAdvertising->start();

    Serial.println("Advertising Started\n");
}

void loop() {
    // Get new sensor events with the readings
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    // Calculate centripetal g-force in the x-y plane
    float centripetal_a = sqrt(pow(a.acceleration.x, 2) + pow(a.acceleration.y, 2));
    float centripetal_g = centripetal_a / 9.81;

    if (deviceConnected) {
        dataBuffer += String(centripetal_g, 4);
        dataBuffer += ",";
        readingCount++;

        if (readingCount >= BUFFER_SIZE) {
            pCharacteristic->setValue(dataBuffer.c_str());
            pCharacteristic->notify();

            dataBuffer = "";
            readingCount = 0;
        }
    }

    delay(SAMPLE_DELAY);
}