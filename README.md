# IoT PBL

Welcome to the **ESP32 WebAR Industrial Dashboard**! This project provides a real-time, zero-latency Augmented Reality (AR) and 2D web dashboard for monitoring industrial sensors and controlling motors directly from an ESP32 micro-controller over local Wi-Fi.

## Project Overview

This system completely bypasses heavy middleware (like ROS or cloud servers) by using native **WebSockets** running directly on the ESP32. It serves both traditional PCs and modern AR-capable smartphones simultaneously.

**Core Features:**
1. **ESP32 Backend:** Reads live Temperature (DHT22) and Current Draw (ACS712) sensors. 
2. **2D Dashboard (PC):** The ESP32 natively serves a beautiful 2D dashboard from its own IP address. No internet or NodeJS required.
3. **WebAR Dashboard (Mobile):** A Vite-powered frontend (located in the `iiot` folder) uses A-Frame and AR.js. When pointed at a Hiro Marker, it renders 3D holographic data floating in physical space.
4. **Safety Interlock:** The ESP32 is programmed with hardcoded safety limits. If Temperature > 27°C **AND** Current > 0.20A, it instantly cuts power to the motor and blasts a critical warning across the WebSocket.

---

## Hardware Configuration

Before uploading the code, wire your ESP32 as follows:

| Component | ESP32 Pin | Important Notes |
| :--- | :--- | :--- |
| **DHT22 (Temp)** | `D18` | Standard digital read. |
| **ACS712 (Current)** | `D32` | **CRITICAL:** The ACS712 requires 5V logic. Power extreme its `VCC` using the ESP32's `VIN` (5V USB) pin. Do not use 3.3V. |
| **Motor Relay** | `D21` | Toggled by safety logic and AR interface. |
| **Status LED** | `D2` | Matches the Motor Relay state. |

---

## Quick Start Guide

### 1. Flash the ESP32
1. Open `/esp32_ar_dashboard/esp32_ar_dashboard.ino` in the Arduino IDE.
2. Change the `ssid` and `password` variables to match your Home Wi-Fi / Hotspot.
3. Upload to your ESP32.
4. Open the **Serial Monitor (115200 baud)** to find your assigned IP Address.

### 2. View the 2D Dashboard (PC)
Simply type the ESP32's IP Address into your PC's browser (e.g. `http://192.168.1.15`). You will get the full 2D dashboard.

### 3. Launch the AR Dashboard (Phone)
We use Vite to host the AR web app locally with A-Frame tracking.

1. Open a terminal and navigate to the `iiot` folder:
   ```bash
   cd iiot
   npm install
   npm run dev -- --host
   ```
2. Vite will give you a **Network Address** (e.g., `http://192.168.1.50:5173/`).
3. Connect your phone to the same Wi-Fi and navigate to that address.
4. It will prompt you for your ESP32's IP address.
5. Point your camera at a standard printed **Hiro Marker** to see the hologram!

---

## Fixing Mobile Camera Permissions

Modern mobile browsers (Chrome/Safari) **block the camera** on local network IP addresses because they require encrypted `https://`. To quickly bypass this for local development testing on Android:

1. Open **Chrome** on your phone.
2. Go to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
3. Enter your laptop's Vite Network Address (e.g., `http://192.168.1.50:5173`) into the text box.
4. Change the dropdown to **Enabled** and Relaunch Chrome.
5. Your camera will now work perfectly on your local network!
