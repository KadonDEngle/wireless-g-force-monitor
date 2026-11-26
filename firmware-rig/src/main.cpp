/*
    ECE 341 Final Project - Stepper controller for accelerometer test device
    Nolan Kessler
    kesslnol@oregonstate.edu
    Nov. 2026
*/

#include <Arduino.h>
#include <AccelStepper.h>

//Stepper pins and config info
#define N_STEPS 200
#define DIR_PIN 4
#define STEP_PIN 5
#define FAULT_PIN 6

#define ACCEL_STEPS_SEC (50.0f * (float)N_STEPS / 60.0f)
#define DECEL_STEPS_SEC (50.0f * (float)N_STEPS / 60.0f)

#define MAX_RPM 300.0f
#define MIN_RPM 0.0f

//Serial Config
#define SERIAL_BAUD 9600
#define SER_BUF_SZ 1024
#define SER_PRINT_PERIOD_MS 50

volatile uint16_t updateTime = 0; //Time the acceleration controller was last updated
volatile float targetSpeed = 0.0; //Target speed the motor should accelerate to (steps/sec)

AccelStepper motor(AccelStepper::DRIVER, STEP_PIN, DIR_PIN);

char serialBuffer[SER_BUF_SZ] = {0};
int  sbOffset;

unsigned long serialPrintTime = 0;

// Convert speed in rpm to motor steps per second
inline float rpmToSteps(float rpm) {
    return rpm * (float)N_STEPS / 60.0f;
}

// Convert speed in motor steps per second to rpm
inline float stepsToRpm(float steps) {
    return (steps / (float)N_STEPS) * 60.0f;
}

// Loop function for handling motor acceleration and deceleration
void handleMotor() {
    float speed = motor.speed();
    uint16_t dt = micros() - updateTime;
    updateTime += dt;

    //Handle acceleration
    if (speed < targetSpeed) {
        speed += ACCEL_STEPS_SEC * (float)dt * 1e-6f;
        if (speed > targetSpeed) {
            speed = targetSpeed;
        }
        motor.setSpeed(speed);
    }
    //Handle deceleration
    else if (speed > targetSpeed) {
        speed -= ACCEL_STEPS_SEC * (float)dt * 1e-6f;
        if (speed < targetSpeed) {
            speed = targetSpeed;
        }
        motor.setSpeed(speed);
    }

    motor.runSpeed();
}

//Sets target motor speed (in rpm)
void setTargetSpeed(float rpm) {
    noInterrupts();
    targetSpeed = rpmToSteps(rpm);
    interrupts();
}

//Get current motor speed(in rpm)
float getMotorSpeed() {
    return stepsToRpm(motor.speed());
}

//Configure motor handler timer interrupt
ISR (TIMER1_COMPA_vect) {
    handleMotor();
}

void setup() {
    motor.setMinPulseWidth(2);
    motor.setMaxSpeed((300.0f * 6400.0f) / 60.0f);
    setTargetSpeed(0.0f);

    // Enable timer counter 1 for motor control
    // 500 us period - 8000 clock cycles @ 16 MHz w/ no prescale
    // CTC mode, with reset on OCR1A
    noInterrupts();
    TCCR1A = 0b00000000; // Set timer control registers
    TCCR1B = 0b00001001;
    TCCR1C = 0b00000000;
    OCR1A  = 8000;       // Configure Cycle Count
    TIMSK1 = 0b00000010; // Enable compare A interrupt
    interrupts();

    Serial.begin(SERIAL_BAUD);
    Serial.setTimeout(1);
}

void loop() {

    // Print current RPM over serial
    unsigned long time = millis();
    if (time - serialPrintTime >= SER_PRINT_PERIOD_MS) {
        Serial.println((String)getMotorSpeed());
        serialPrintTime = time;
    }
    
    // Check for new rpm commands being sent over serial
    while (Serial.available()) {
        char byte = Serial.read();

        // If a newline is received, message is terminated
        if (byte == '\n') {
            // Attempt to convert string to float
            serialBuffer[sbOffset] = '\0';
            double newRpm = strtod(serialBuffer, NULL);

            // Set motor to new rpm if in range, zero otherwise
            if (newRpm <= MAX_RPM && newRpm >= MIN_RPM) {
                setTargetSpeed(newRpm);
            }
            else {
                setTargetSpeed(0.0);
            }

            sbOffset = 0;
            continue;
        }

        // Otherwise append byte to buffer if buffer is not full
        if (sbOffset < SER_BUF_SZ - 1) { // -1 -> Leave room for null terminator in buffer
            serialBuffer[sbOffset] = byte;
            sbOffset ++;
        }
    }

}
