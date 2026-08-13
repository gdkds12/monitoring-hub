#!/bin/bash
set -e

echo "========================================="
echo "   Antigravity Monitor Agent Installer   "
echo "========================================="

# 1. Check if run from the correct directory
if [ ! -f "agent.js" ]; then
    echo "Error: Please run this script from inside the monitor-agent directory!"
    exit 1
fi

# 2. Get Node details
read -p "Enter Node ID (e.g., kr-seoul-01): " NODE_ID
read -p "Enter Node Name (e.g., KR Seoul 01): " NODE_NAME

# If empty, set defaults
NODE_ID=${NODE_ID:-"unknown-node"}
NODE_NAME=${NODE_NAME:-"Unknown Node"}

AGENT_DIR=$(pwd)
NODE_PATH=$(which node || echo "/usr/bin/node")
CURRENT_USER=$(whoami)

# 3. Create config.json
echo "[1/4] Creating config.json..."
cat << EOF > config.json
{
  "hubUrl": "wss://monitor-hub.cloudhomes.org/ws/agent",
  "nodeId": "$NODE_ID",
  "nodeName": "$NODE_NAME",
  "secretToken": "antigravity-monitor-secret-key-2026",
  "pushIntervalMs": 2000
}
EOF

# 4. Install dependencies
echo "[2/4] Installing Node.js dependencies..."
npm install

# 5. Generate monitor-agent.service dynamically
echo "[3/4] Generating systemd service file..."
cat << EOF > monitor-agent.service
[Unit]
Description=Antigravity Monitor Agent
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$AGENT_DIR
ExecStart=$NODE_PATH agent.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 6. Install and start service
echo "[4/4] Registering systemd service..."
sudo cp monitor-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable monitor-agent
sudo systemctl restart monitor-agent

echo ""
echo "========================================="
echo " 🎉 Installation Complete! "
echo " The agent is now running in the background."
echo " Check status with: sudo systemctl status monitor-agent"
echo "========================================="
