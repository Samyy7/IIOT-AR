  #include <WiFi.h>
  #include <ESPAsyncWebServer.h>
  #include <DHT.h>

  // ====== Wi-Fi Credentials ======
  // IMPORTANT: Enter your HOME Wi-Fi credentials here!
  // Your phone and ESP32 must be on the same network with internet access.
  const char* ssid = "JAYESH";
  const char* password = "12345678";

  // ====== SENSOR PINS & CONFIG ======
  #define DHTPIN 18
  #define DHTTYPE DHT22
  #define CURRENT_SENSOR_PIN 32

  // ====== SAFETY THRESHOLDS ======
  #define TEMP_THRESHOLD 27.0
  #define CURRENT_THRESHOLD 0.20

  DHT dht(DHTPIN, DHTTYPE);

  // ====== Server & WebSocket ======
  AsyncWebServer server(80);
  AsyncWebSocket ws("/ws");

  // ====== LED ======
  const int ledPin = 2; 
  const int extraPin = 21;
  bool ledState = false;

  // ====== HTML Content (Stored in PROGMEM) ======
  const char index_html[] PROGMEM = R"rawliteral(
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Robot Dashboard</title>
    <style>
      :root {
        --bg-color: #12141D;
        --card-bg: #1E2130;
        --accent-blue: #00D2FF;
        --accent-green: #00FF87;
        --accent-pink: #FF007A;
        --text-main: #FFFFFF;
        --text-muted: #8B94A7;
      }
      
      body {
        font-family: 'Segoe UI', system-ui, sans-serif;
        background-color: var(--bg-color);
        color: var(--text-main);
        margin: 0;
        padding: 20px;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 10px;
        border-bottom: 1px solid #2A2E43;
      }

      .status-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.05);
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: red;
        box-shadow: 0 0 10px red;
      }
      .dot.connected { background: var(--accent-green); box-shadow: 0 0 10px var(--accent-green); }

      /* Dashboard Grid */
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 20px;
      }

      .card {
        background: var(--card-bg);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.02);
        position: relative;
      }

      .card h3 {
        margin: 0 0 15px 0;
        color: var(--text-muted);
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .sensor-value {
        font-size: 42px;
        font-weight: 700;
        margin: 0;
      }

      .sensor-unit {
        font-size: 18px;
        color: var(--text-muted);
      }

      .icon {
        position: absolute;
        top: 24px;
        right: 24px;
        width: 28px;
        height: 28px;
        opacity: 0.8;
      }

      /* Toggle Switch */
      .switch {
        position: relative;
        display: inline-block;
        width: 60px;
        height: 34px;
      }
      .switch input { opacity: 0; width: 0; height: 0; }
      .slider {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #2A2E43;
        transition: .4s;
        border-radius: 34px;
      }
      .slider:before {
        position: absolute;
        content: "";
        height: 26px; width: 26px;
        left: 4px; bottom: 4px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }
      input:checked + .slider { background-color: var(--accent-blue); box-shadow: 0 0 15px rgba(0, 210, 255, 0.4); }
      input:checked + .slider:before { transform: translateX(26px); }

      /* Serial Terminal */
      .terminal-card {
        grid-column: 1 / -1; /* Spans full width */
      }
      #log {
        background: #0A0B10;
        color: var(--accent-green);
        font-family: 'Courier New', monospace;
        padding: 15px;
        height: 200px;
        overflow-y: scroll;
        border-radius: 8px;
        margin: 0;
        font-size: 14px;
      }
    </style>
  </head>
  <body>

    <div class="header">
      <h2>Motor monitor </h2>
      <div class="status-badge">
        <div id="conn-dot" class="dot"></div>
        <span id="conn-text">Disconnected</span>
      </div>
    </div>

    <div class="grid">
      
      <div class="card">
        <h3>Motor Status</h3>
        <svg class="icon" stroke="var(--accent-blue)" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        <label class="switch">
          <input type="checkbox" id="ledToggle" onchange="toggleLED()">
          <span class="slider"></span>
        </label>
        <p style="margin-top: 15px; color: var(--text-muted);" id="ledStatusText">OFF</p>
      </div>

      <div class="card">
        <h3>Internal Temp</h3>
        <svg class="icon" stroke="var(--accent-pink)" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
        <div class="sensor-value" id="val-temp">-- <span class="sensor-unit">°C</span></div>
      </div>

      <div class="card">
        <h3>Current Draw</h3>
        <svg class="icon" stroke="var(--accent-green)" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg>
        <div class="sensor-value" id="val-cur">-- <span class="sensor-unit">A</span></div>
      </div>

      <div class="card terminal-card">
        <h3>Live Data Feed</h3>
        <pre id="log">Waiting for data...</pre>
      </div>

    </div>

    <script>
      let ws;
      let logBox = document.getElementById("log");

      function initWebSocket() {
        ws = new WebSocket("ws://" + location.host + "/ws");
        
        ws.onopen = () => {
          document.getElementById("conn-dot").classList.add("connected");
          document.getElementById("conn-text").innerText = "Connected";
        };

        ws.onclose = () => {
          document.getElementById("conn-dot").classList.remove("connected");
          document.getElementById("conn-text").innerText = "Disconnected";
          setTimeout(initWebSocket, 2000); // Auto-reconnect
        };

        ws.onmessage = (event) => {
          let msg = event.data;

          // Handle Serial Text
          if (msg.startsWith("$SERIAL")) {
            let text = msg.split(",")[1].replace("*","");
            logBox.textContent += "\n" + text;
            logBox.scrollTop = logBox.scrollHeight;
          }
          
          // Handle LED State
          else if (msg.startsWith("$LED")) {
            let state = msg.split(",")[1].replace("*","");
            let isON = (state === "ON");
            document.getElementById("ledToggle").checked = isON;
            document.getElementById("ledStatusText").innerText = state;
          }

          // Handle Sensors
          else if (msg.startsWith("$SENSOR")) {
            let parts = msg.split(",");
            if(parts.length >= 3) {
              let type = parts[1];
              let val = parts[2].replace("*", "");
              
              if(type === "TEMP") document.getElementById("val-temp").innerHTML = val + ' <span class="sensor-unit">°C</span>';
              if(type === "CUR") document.getElementById("val-cur").innerHTML = val + ' <span class="sensor-unit">A</span>';
            }
          }
        };
      }

      function toggleLED() {
        if(ws && ws.readyState === WebSocket.OPEN) {
          ws.send("$LED,TOGGLE*");
        }
      }

      window.onload = initWebSocket;
    </script>

  </body>
  </html>
  )rawliteral";

  // ====== WebSocket Event Handler ======
  void onWebSocketEvent(AsyncWebSocket * server, AsyncWebSocketClient * client, AwsEventType type, void * arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_CONNECT) {
      client->text("$STATUS,CONNECTED*");
      client->text(ledState ? "$LED,ON*" : "$LED,OFF*");
    } else if (type == WS_EVT_DATA) {
      String msg = "";
      for (size_t i = 0; i < len; i++) msg += (char)data[i];
      if (msg == "$LED,TOGGLE*") {
        ledState = !ledState;
        digitalWrite(ledPin, ledState);
        digitalWrite(extraPin, ledState);
        ws.textAll(ledState ? "$LED,ON*" : "$LED,OFF*");
      }
    }
  }

  void setup() {
    Serial.begin(115200);
    pinMode(ledPin, OUTPUT);
    digitalWrite(ledPin, LOW);
    
    pinMode(extraPin, OUTPUT);
    digitalWrite(extraPin, LOW);

    // Init Sensors
    dht.begin();
    pinMode(CURRENT_SENSOR_PIN, INPUT);

    Serial.print("Connecting to WiFi: ");
    Serial.println(ssid);
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    
    Serial.println("");
    Serial.println("WiFi connected.");
    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());

    ws.onEvent(onWebSocketEvent);
    server.addHandler(&ws);

    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
      request->send_P(200, "text/html", index_html);
    });

    server.begin();
  }

  void loop() {
    // Clean up inactive clients to prevent memory leaks and broadcasting hangs over hotspot!
    ws.cleanupClients();

    // 1. Serial passthrough
    if (Serial.available()) {
      String msg = Serial.readStringUntil('\n');
      msg.trim();
      if(msg.length() > 0) ws.textAll("$SERIAL," + msg + "*");
    }

    // 2. Sensor Sampling
    static unsigned long lastUpdate = 0;
    if (millis() - lastUpdate > 2000) {
      float t = dht.readTemperature();
      
      // Accurate voltage reading using ESP32's built-in calibration & Averaging filter
      // We take 100 samples to smooth out random electrical noise!
      long sumRaw = 0;
      float sumVolts = 0.0;
      for(int i = 0; i < 100; i++) {
        sumRaw += analogRead(CURRENT_SENSOR_PIN);
        sumVolts += (analogReadMilliVolts(CURRENT_SENSOR_PIN) / 1000.0);
        delay(2); // Wait slightly between samples to spread them across 200ms
      }
      
      int raw = sumRaw / 100;
      float voltage = sumVolts / 100.0;
      
      // --- CALIBRATION VARIABLES ---
      // If you measure 0 Amps, look at the Serial Monitor to see what 'Voltage' is printed.
      // Change 'zeroOffset' to match that exact voltage! 
      // Typical ACS712 on 5V gives 2.5. On 3.3V it gives ~1.65.
      float zeroOffset = 2.56;  
      
      // Sensitivity: 5A module = 0.185 | 20A module = 0.100 | 30A module = 0.066
      float voltsPerAmp = 0.185; 

      float current = -1.0 * ((voltage - zeroOffset) / voltsPerAmp); 
      
      // --- AUTOMATIC MOTOR SAFETY LOGIC ---
      static unsigned long lastWarning = 0;
      bool highTemp = (t > TEMP_THRESHOLD);
      bool highCur = (abs(current) > CURRENT_THRESHOLD && ledState);
      
      if (highTemp && highCur) {
        if (ledState) {
          ledState = false; // Turn off Motor automatically!
          digitalWrite(ledPin, LOW);
          digitalWrite(extraPin, LOW);
          ws.textAll("$LED,OFF*");
          ws.textAll("$SERIAL,CRITICAL: Overload! Motor auto-stopped!*");
        }
      } else if (millis() - lastWarning > 4000) {
        if (highTemp && !highCur) {
          ws.textAll("$SERIAL,WARNING: Temperature is too high!*");
          lastWarning = millis();
        } else if (highCur && !highTemp) {
          ws.textAll("$SERIAL,WARNING: Motor current is too high!*");
          lastWarning = millis();
        }
      }
      
      // Print to serial so you can easily debug the sensor readings!
      Serial.printf("Raw ADC: %d | Voltage: %.2fV | Computed Current: %.2fA\n", raw, voltage, current);


      if (!isnan(t)) ws.textAll("$SENSOR,TEMP," + String(t, 1) + "*");
      ws.textAll("$SENSOR,CUR," + String(current, 2) + "*");
      
      lastUpdate = millis();
    }
  }
