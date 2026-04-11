#!/bin/bash
# start.sh - Start the WebAR Motor Dashboard System

echo "Starting ROS 2 AR Motor Dashboard..."

cd /ros2_ws/

# Source standard ROS 2 environment
source install/setup.bash 

# Set the ROS Domain ID as per documentation
export ROS_DOMAIN_ID=9

echo "Starting odrive hardware interface..."
# Assuming workspace is sourced or in path. Comment out or modify if needed.
ros2 launch odrive_hardware_interface test.launch.py &
ODRIVE_PID=$!


echo "Starting rosbridge_websocket on port 9090..."
ros2 launch rosbridge_server rosbridge_websocket_launch.xml port:=9090 &
ROSBRIDGE_PID=$!

echo "Starting frontend IIoT dashboard (Vite)..."
# Assuming the script is run from the iiot directory
cd /ros2_ws/src/iiot
npm run dev
