####################################
# MTT Robot R2 Base Container
####################################

# Context is the root of the repository

# Using Multi-Stage Build
FROM ghcr.io/mittechteam/humble-garden:v2.4.3 as builder

# Add the following labels
LABEL org.opencontainers.image.description="MTT Robot R2 Base Container"
LABEL org.opencontainers.image.title="robot2-2024-base"
LABEL org.opencontainers.image.vendor="MIT Tech Team"
LABEL org.opencontainers.image.source="https://github.com/mittechteam/robot2_2024"
LABEL org.opencontainers.image.licenses="MIT"


# ----------------------------------
# Stage 1: Build Third Party Libraries
# ----------------------------------
FROM builder as third_party_builder
# Import the Third Party Libraries
COPY third_party /ros2_ws/src/third_party

# Colcon build the workspace
WORKDIR /ros2_ws
# source humble environment
RUN source /opt/ros/${ROS_DISTRO}/setup.bash && colcon build --packages-up-to \
    --cmake-args -DCMAKE_BUILD_TYPE=Release

# # ----------------------------------
# # Stage 2: Build the MTT Libraries
# # ----------------------------------
FROM builder as mtt_builder

# Import the MTT Libraries
COPY core_repo /ros2_ws/src/core_repo

# # Colcon build the workspace
WORKDIR /ros2_ws
# source humble environment
RUN source /opt/ros/${ROS_DISTRO}/setup.bash && colcon build --packages-up-to \
    --cmake-args -DCMAKE_BUILD_TYPE=Release

# ----------------------------------
# Stage 3: Combine the MTT & Third Party Libraries
# ----------------------------------
FROM builder as final

# Import the Third Party Libraries
COPY --from=third_party_builder /ros2_ws/install /ros2_ws/install

# Import the MTT Libraries
COPY --from=mtt_builder /ros2_ws/install /ros2_ws/install
