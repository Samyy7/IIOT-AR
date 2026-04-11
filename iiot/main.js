document.addEventListener('DOMContentLoaded', () => {
    const marker = document.querySelector('#motor-marker');
    const uiOverlay = document.querySelector('#ui-overlay');
    const statusText = document.querySelector('#status-text');
    
    // Using setTimeout to wait for A-Frame components to initialize if necessary
    setTimeout(() => {
        const canvas = document.querySelector('#data-canvas');
        const ctx = canvas ? canvas.getContext('2d') : null;
        const dataPlane = document.querySelector('#data-plane');

        let updateInterval;

        // Base statistics for our dummy Industrial Motor
        const baseRPM = 1450;
        const baseCurrent = 5.2;
        
        // Data history for graphs
        const maxDataPoints = 60;
        const velocityHistory = new Array(maxDataPoints).fill(0);
        const currentHistory = new Array(maxDataPoints).fill(0);

        // Current state
        let currentVelocity = 0;
        let currentBusCurrent = 0;

        // ROS Setup
        const rosProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const rosUrl = `${rosProtocol}//${window.location.host}/rosbridge`;
        const ros = new ROSLIB.Ros({
            url : rosUrl
        });

        ros.on('connection', function() {
            console.log('Connected to websocket server.');
            statusText.innerText = 'Connected to ROS Bridge';
        });

        ros.on('error', function(error) {
            console.log('Error connecting to websocket server: ', error);
            statusText.innerText = 'WebSocket Error';
        });

        ros.on('close', function() {
            console.log('Connection to websocket server closed.');
            statusText.innerText = 'WebSocket Closed';
        });

        const jointStateListener = new ROSLIB.Topic({
            ros : ros,
            name : '/dynamic_joint_states',
            messageType : 'control_msgs/msg/DynamicJointState'
        });

        jointStateListener.subscribe(function(message) {
            const jointIndex = message.joint_names.indexOf('wheel_joint');
            if (jointIndex !== -1) {
                const ifaces = message.interface_values[jointIndex].interface_names;
                const vals = message.interface_values[jointIndex].values;
                
                const velIndex = ifaces.indexOf('velocity');
                if (velIndex !== -1) {
                    currentVelocity = vals[velIndex];
                }
                
                const currIndex = ifaces.indexOf('bus_current');
                if (currIndex !== -1) {
                    currentBusCurrent = vals[currIndex];
                }
            }
        });

        // Helper to draw sparkline graphs inline
        const drawSparkline = (ctx, data, x, y, width, height, color, min, max) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            // Ensure min and max are not identical to avoid division by zero
            if (max === min) {
                max = min + 1;
            }
            
            for (let i = 0; i < data.length; i++) {
                // Clamp range to prevent drawing outside graph
                let val = Math.max(min, Math.min(max, data[i])); 
                const normalized = (val - min) / (max - min); 
                const px = x + (i / (data.length - 1)) * width;
                const py = y + height - (normalized * height);
                
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.stroke();

            // Light translucent fill under curve
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
            ctx.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba').replace('#ffffff', 'rgba(255,255,255,0.05)').replace('#e94560', 'rgba(233,69,96,0.1)');
            ctx.fill();
        };

        const renderData = () => {
            if (!ctx) return;

            // Push to history arrays
            velocityHistory.shift();
            velocityHistory.push(currentVelocity);
            currentHistory.shift();
            currentHistory.push(currentBusCurrent);

            // Draw to canvas for robust 2D rendering without CORS font issues
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Canvas Backplate
            ctx.fillStyle = 'rgba(26, 26, 46, 0.9)'; // Dark panel
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Decorative line
            ctx.fillStyle = '#4ecca3';
            ctx.fillRect(0, canvas.height - 30, canvas.width, 30);

            // Title
            ctx.fillStyle = '#e94560';
            ctx.font = 'bold 50px Inter, sans-serif';
            ctx.fillText('BLDC MOTOR STATUS', 50, 80);

            // Health Indicator
            let healthColor = '#4ecca3';
            let healthText = 'HEALTHY';
            let healthDotX = 760; // adjusting for wider text
            if (currentBusCurrent >= 0.33) {
                healthColor = '#e94560'; // red warning
                healthText = 'WARNING';
            } else {
                healthDotX = 780; // slightly different position for shorter word
            }

            ctx.fillStyle = healthColor;
            ctx.beginPath();            
            ctx.arc(healthDotX, 65, 15, 0, Math.PI*2);
            ctx.fill();
            ctx.font = 'bold 35px Inter, sans-serif';
            ctx.fillText(healthText, healthDotX + 30, 75);

            // Label Velocity
            ctx.fillStyle = '#a0aab2';
            ctx.font = '45px Inter, sans-serif';
            ctx.fillText('Velocity', 50, 200);
            
            // Label Current
            ctx.fillText('Bus Current', 50, 390);

            // Value Velocity
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 85px Inter, sans-serif';
            ctx.textAlign = 'right';
            const velStr = Number(currentVelocity).toFixed(2);
            ctx.fillText(velStr, 950, 210);

            // Dynamic graph limits
            const minV = Math.min(...velocityHistory) - 1.0;
            const maxV = Math.max(...velocityHistory) + 1.0;
            const minC = Math.min(...currentHistory) - 1.0;
            const maxC = Math.max(...currentHistory) + 1.0;

            // Draw Velocity Graph 
            drawSparkline(ctx, velocityHistory, 50, 230, 900, 80, '#ffffff', minV, maxV);

            // Value Current
            ctx.fillStyle = healthColor; // Matches the dynamically determined health color
            ctx.font = 'bold 85px Inter, sans-serif';
            const curStr = Number(currentBusCurrent).toFixed(2);
            ctx.fillText(curStr, 950, 400);

            // Draw Current Graph
            drawSparkline(ctx, currentHistory, 50, 420, 900, 80, '#ffffff', minC, maxC);

            // Reset alignment
            ctx.textAlign = 'left';

            // Push texture update to A-Frame material component
            if (dataPlane) {
                const mesh = dataPlane.getObject3D('mesh');
                if (mesh && mesh.material && mesh.material.map) {
                    mesh.material.map.needsUpdate = true;
                }
            }
        };

        if (marker) {
            marker.addEventListener('markerFound', () => {
                if (ros.isConnected) {
                    statusText.innerText = 'Motor Detected! Live Data Active';
                } else {
                    statusText.innerText = 'Motor Detected! Waiting for ROS...';
                }
                // Fade out overlay to reveal AR clearly
                uiOverlay.style.opacity = '0';
                
                // Start live data feed animation
                updateInterval = setInterval(renderData, 100);
                renderData();
            });

            marker.addEventListener('markerLost', () => {
                // Fade overlay back in
                uiOverlay.style.opacity = '1';
                statusText.innerText = 'Scanning for Motor Marker...';
                
                if (updateInterval) {
                    clearInterval(updateInterval);
                }
            });
        }
    }, 1000); // slight delay ensures DOM completely populated by a-frame
});
