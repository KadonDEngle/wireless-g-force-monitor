# Wireless G-Force Monitor
**ECE 341 - Junior Design - Final Project**  
Kadon Engle • Nolan Kessler • Jonathan Fiorini

---

A battery-powered, wireless acceleration monitoring system built using an ESP32, MPU6050 IMU, and a custom voltage regulator PCB.

Includes a custom stepper-driven test rig used for sensor verification.

Front end web-app uses the Web Bluetooth API to display real-time acceleration data as well as the Web Serial API to interface with and control the test rig.

---

**Web App:** https://kadondengle.github.io/wireless-g-force-monitor/

Two web interfaces are hosted via the selector page:
- **Interface A** (`/jonathan`) — Hand-coded by Jonathan Fiorini.
- **Interface B** (`/kadon`) — AI-assisted, developed by Kadon Engle.