# ROS 2 AR Motor Dashboard

Welcome to the **ROS 2 AR Motor Dashboard** project! This repository contains the ROS 2 packages and the front-end web dashboard to perform real-time monitoring of BLDC motors (like ODrive) using Vite and `rosbridge_server`.

## Project Overview

This system is designed to provide a real-time Augmented Reality (AR) capable dashboard that dynamically updates motor health indicators.

**Core Components:**
1. **Hardware Interfaces:** Contains implementations for various hardware controllers (ODrive, VESC, Servos) to communicate over ROS 2. Provides the `/dynamic_joint_states` topic for observing live telemetry data.
2. **ROS Bridge Server:** A WebSocket server (`rosbridge_websocket`) routing ROS 2 traffic (specifically on Domain `9`) out to the front-end application via port `9090`.
3. **IIoT UI Dashboard:** A modern, Vite-powered web application connected via `roslibjs` that subscribes to motor states and provides an interactive user experience.

## Quick Start Commands

We've provided a few helper scripts located at the workspace root (`/ros2_ws`) to make managing the dashboard's lifecycle incredibly easy.

### ▶️ Starting the System

To launch the ODrive hardware interface, spawn the ROS WebSocket bridge, and start the Vite dev server, run:

```bash
cd /ros2_ws
./start.sh
```

```bash
ros2 topic pub /velocity_controller/commands std_msgs/msg/Float64MultiArray "data: [ 100.0 ]"
```

**What it does:**
- Sources your ROS 2 `humble` workspace automatically.
- Launches the `odrive_hardware_interface`.
- Starts `rosbridge_websocket` on `ROS_DOMAIN_ID=9`.
- Spins up the Vite proxy server for the frontend UI.

### 🛑 Stopping the System Cleanly

Sometimes background nodes and WebSockets drop to the background and keep port `9090` busy. If you encounter an `[Errno 98] Address already in use` error or simply want to cleanly shut everything down, run:

```bash
cd /ros2_ws
./stop.sh
```

**What it does:**
- Force-kills `rosbridge_server` zombie processes.
- Terminates all active ROS 2 launch tasks.
- Kills the Node/Vite instances cleanly.

## Architecture & Communication

- **ROS Domain ID:** `9`
- **Bridge Port (Internal):** `9090`
- **Main Topic:** `/dynamic_joint_states` (published as `std_msgs/msg/Float64MultiArray` or compatible format)

Make sure no other services on your machine are utilizing port 9090, or the `rosbridge_server` will fail to bind properly!
