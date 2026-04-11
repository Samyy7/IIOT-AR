#!/bin/bash
# stop.sh - Stop the WebAR Motor Dashboard System

echo "Stopping ROS 2 AR Motor Dashboard..."

echo "Terminating Vite server..."
pkill -f "vite"

echo "Terminating rosbridge_websocket..."
pkill -9 -f "rosbridge_server" || true
fuser -k -9 9090/tcp 2>/dev/null || true

echo "Terminating odrive hardware interface..."
pkill -f "odrive_hardware_interface"
pkill -f "test.launch.py"

echo "All processes stopped cleanly."
