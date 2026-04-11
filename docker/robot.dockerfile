####################################
# MTT Robot R2 Container
####################################

# Context is the root of the repository

# Using Multi-Stage Build

# ----------------------------------
# Stage 1: Build Third Party Libraries
# ----------------------------------
FROM ghcr.io/mittechteam/robot2-2024-base as builder

# Add the following labels
LABEL org.opencontainers.image.description="MTT Robot R2 Container"
LABEL org.opencontainers.image.vendor="MIT Tech Team"
LABEL org.opencontainers.image.source="https://github.com/mittechteam/robot2_2024"
LABEL org.opencontainers.image.licenses="MIT"

# Colcon build the workspace
WORKDIR /ros2_ws

# Copy the whole repository into the workspace
COPY . /ros2_ws/src

# ROS Localhost discovery only, This will ensure the robot is not affected by any other PC,
# running ROS on local network.
ENV ROS_LOCALHOST_ONLY 1

# Colcon build the workspace
WORKDIR /ros2_ws
# source humble environment & build packages
RUN source /opt/ros/humble/setup.bash \
    && source install/setup.bash \
    && colcon build --packages-up-to robot_bringup \
    --cmake-args -DCMAKE_BUILD_TYPE=Release

# ----------------------------------
# Stage 2: Copy only the installed packages
# ----------------------------------
FROM ghcr.io/mittechteam/robot2-2024-base as final

# Copy the installed packages
COPY --from=builder /ros2_ws/install /ros2_ws/install

# install lap 
RUN pip3 install lap
# Copy the supervisor configuration
COPY ./robot_startup/ /app/conf.d/