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

        // Data history for graphs
        const maxDataPoints = 60;
        const tempHistory = new Array(maxDataPoints).fill(0);
        const ampHistory = new Array(maxDataPoints).fill(0);

        // Current state
        let currentTemp = 0;
        let currentAmp = 0;

        // Safety Thresholds
        const TEMP_THRESHOLD = 27.0;
        const CURRENT_THRESHOLD = 0.20;

        // ESP32 WebSocket Setup
        let espIp = localStorage.getItem("espIp") || "192.168.1.30";
        espIp = prompt("Enter ESP32 IP address (check Arduino Serial Monitor):", espIp);
        if(espIp) localStorage.setItem("espIp", espIp);

        const wsUrl = `ws://${espIp}/ws`;
        let ws;

        function connectWebSocket() {
            ws = new WebSocket(wsUrl);
            window.espWs = ws;

            ws.onopen = function() {
                console.log('Connected to ESP32 websocket server.');
                statusText.innerText = 'Connected to ESP32';
            };

            ws.onerror = function(error) {
                console.log('Error connecting to websocket server: ', error);
                statusText.innerText = 'WebSocket Error. Retrying...';
            };

            ws.onclose = function() {
                console.log('Connection to websocket server closed. Retrying in 2s...');
                statusText.innerText = 'WebSocket Closed. Retrying...';
                setTimeout(connectWebSocket, 2000);
            };

            ws.onmessage = function(event) {
                let msg = event.data;
                if (msg.startsWith("$SENSOR")) {
                    let parts = msg.split(",");
                    let type = parts[1];
                    let val = parseFloat(parts[2].replace("*", ""));
                    
                    if (type === "TEMP") {
                        currentTemp = val;
                    } else if (type === "CUR") {
                        currentAmp = val;
                    }
                }
            };
        }

        connectWebSocket();

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
            tempHistory.shift();
            tempHistory.push(currentTemp);
            ampHistory.shift();
            ampHistory.push(currentAmp);

            // Draw to canvas for robust 2D rendering without CORS font issues
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Canvas Backplate
            ctx.fillStyle = 'rgba(26, 26, 46, 0.9)'; // Dark panel
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Decorative line
            ctx.fillStyle = '#4ecca3';
            ctx.fillRect(0, canvas.height - 30, canvas.width, 30);

            // Title
            ctx.fillStyle = '#00D2FF';
            ctx.font = 'bold 50px Inter, sans-serif';
            ctx.fillText('Motor monitor ', 50, 80);

            // Health Indicator dynamically matching backend safety constraints
            let healthColor = '#4ecca3';
            let healthText = 'HEALTHY';
            let healthDotX = 760; 
            
            if (currentTemp > TEMP_THRESHOLD && Math.abs(currentAmp) > CURRENT_THRESHOLD) {
                healthColor = '#FF007A'; // red critical
                healthText = 'CRIT STOP';
                healthDotX = 660;
            } else if (currentTemp > TEMP_THRESHOLD) {
                healthColor = '#FFA500'; // orange warning
                healthText = 'HIGH TEMP';
                healthDotX = 660;
            } else if (Math.abs(currentAmp) > CURRENT_THRESHOLD) {
                healthColor = '#FFA500'; // orange warning
                healthText = 'HIGH CURR';
                healthDotX = 660;
            } else {
                healthDotX = 780;
            }

            ctx.fillStyle = healthColor;
            ctx.beginPath();            
            ctx.arc(healthDotX, 65, 15, 0, Math.PI*2);
            ctx.fill();
            ctx.font = 'bold 35px Inter, sans-serif';
            ctx.fillText(healthText, healthDotX + 30, 75);

            // Label Temp
            ctx.fillStyle = '#a0aab2';
            ctx.font = '45px Inter, sans-serif';
            ctx.fillText('Temperature', 50, 200);
            
            // Label Current
            ctx.fillText('Current Draw', 50, 390);

            // Value Temp
            ctx.fillStyle = '#00FF87';
            ctx.font = 'bold 85px Inter, sans-serif';
            ctx.textAlign = 'right';
            const tempStr = Number(currentTemp).toFixed(1) + " °C";
            ctx.fillText(tempStr, 950, 210);

            // Dynamic graph limits
            const minT = Math.min(...tempHistory) - 1.0;
            const maxT = Math.max(...tempHistory) + 1.0;
            const minC = Math.min(...ampHistory) - 0.5;
            const maxC = Math.max(...ampHistory) + 0.5;

            // Draw Temp Graph 
            drawSparkline(ctx, tempHistory, 50, 230, 900, 80, '#00FF87', minT, maxT);

            // Value Current
            ctx.fillStyle = '#00D2FF';
            ctx.font = 'bold 85px Inter, sans-serif';
            const curStr = Number(currentAmp).toFixed(2) + " A";
            ctx.fillText(curStr, 950, 400);

            // Draw Current Graph
            drawSparkline(ctx, ampHistory, 50, 420, 900, 80, '#00D2FF', minC, maxC);

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
                if (ws && ws.readyState === WebSocket.OPEN) {
                    statusText.innerText = 'Marker Detected! Live Data Active';
                } else {
                    statusText.innerText = 'Marker Detected! Waiting for ESP32...';
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
                statusText.innerText = 'Scanning for Hiro Marker...';
                
                if (updateInterval) {
                    clearInterval(updateInterval);
                }
            });
        }
    }, 1000); // slight delay ensures DOM completely populated by a-frame
});

window.toggleMotorAR = function() {
    // Send toggle command specifically to existing websocket if open
    if(window.espWs && window.espWs.readyState === 1) {
        window.espWs.send("$LED,TOGGLE*");
    }
};
