import WebSocket from 'ws';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getSystemTelemetry } from './lib/systemMetrics.js';
import { 
  getContainersList, 
  getContainerStats, 
  controlContainer, 
  getContainerLogs 
} from './lib/dockerMetrics.js';
import { getNetworkPorts } from './lib/networkPorts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read config.json
const configPath = path.join(__dirname, 'config.json');
let config = {
  hubUrl: 'wss://monitor-hub.cloudhomes.workers.dev/ws/agent',
  nodeId: 'oci-arm64-ubuntu',
  nodeName: 'OCI ARM64 (4 Core, 24GB)',
  secretToken: 'antigravity-monitor-secret-key-2026',
  pushIntervalMs: 2000
};

if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = { ...config, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to parse config.json, using defaults:', err.message);
  }
}

let ws = null;
let telemetryInterval = null;
let pingInterval = null;
let connectionWatchdog = null;
let lastPongTime = Date.now();
let isReconnecting = false;
let isDashboardActive = false; // NEW: Cost saving flag

function connectToHub() {
  const wsUrl = `${config.hubUrl}?nodeId=${encodeURIComponent(config.nodeId)}&name=${encodeURIComponent(config.nodeName)}&token=${encodeURIComponent(config.secretToken)}`;
  console.log(`[Agent] Connecting to Central Hub: ${config.hubUrl} (Node ID: ${config.nodeId})`);

  try {
    ws = new WebSocket(wsUrl);
  } catch (err) {
    console.error('[Agent] WebSocket init failed:', err.message);
    scheduleReconnect();
    return;
  }

  ws.on('open', () => {
    console.log('[Agent] Successfully connected to Central Hub DO!');
    lastPongTime = Date.now();
    
    // Register agent
    ws.send(JSON.stringify({
      type: 'register',
      nodeId: config.nodeId,
      name: config.nodeName,
      timestamp: Date.now()
    }));

    // Note: Telemetry will only start when a dashboard connects
    if (telemetryInterval) clearInterval(telemetryInterval);


    // Start Ping/Pong keep-alive (App level for Hub Watchdog)
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 10000);

    // Start Watchdog to detect half-open broken connections
    if (connectionWatchdog) clearInterval(connectionWatchdog);
    connectionWatchdog = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN && Date.now() - lastPongTime > 30000) {
        console.error('[Agent] Watchdog: No pong from Hub in 30s. Terminating connection...');
        ws.terminate();
      }
    }, 5000);
  });

  // App-level pong is now handled in 'message' event
  
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'pong') {
        lastPongTime = Date.now();
        return;
      }

      if (msg.type === 'dashboard_status') {
        isDashboardActive = msg.active;
        console.log(`[Agent] Dashboard is now ${isDashboardActive ? 'ACTIVE (Starting Telemetry)' : 'INACTIVE (Sleeping to save costs)'}`);
        
        if (telemetryInterval) clearInterval(telemetryInterval);
        
        if (isDashboardActive) {
          pushTelemetry(); // push immediately once
          telemetryInterval = setInterval(pushTelemetry, config.pushIntervalMs);
        }
        return;
      }

      console.log('[Agent] Received command from Hub:', msg.type, msg.reqId || '');
      await handleHubCommand(msg);
    } catch (err) {
      console.error('[Agent] Error handling Hub message:', err.message);
    }
  });

  ws.on('close', (code, reason) => {
    console.warn(`[Agent] Disconnected from Hub (code: ${code}, reason: ${reason || 'none'})`);
    if (telemetryInterval) clearInterval(telemetryInterval);
    if (pingInterval) clearInterval(pingInterval);
    if (connectionWatchdog) clearInterval(connectionWatchdog);
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    console.error('[Agent] Connection error:', err.message);
    ws.close();
  });
}

function scheduleReconnect() {
  if (isReconnecting) return;
  isReconnecting = true;
  setTimeout(() => {
    console.log('[Agent] Attempting reconnect...');
    isReconnecting = false;
    connectToHub();
  }, 5000);
}

async function pushTelemetry() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  try {
    const [telemetry, containers, ports] = await Promise.all([
      getSystemTelemetry(),
      getContainersList(),
      getNetworkPorts()
    ]);

    const containersWithStats = await Promise.all(
      containers.map(async (c) => {
        if (c.state === 'running') {
          const stats = await getContainerStats(c.id);
          return { ...c, stats };
        }
        return { ...c, stats: { cpuPercent: 0, memoryUsageBytes: 0, memoryPercent: 0 } };
      })
    );

    const payload = {
      type: 'telemetry',
      nodeId: config.nodeId,
      name: config.nodeName,
      telemetry,
      containers: containersWithStats,
      ports,
      timestamp: Date.now()
    };

    ws.send(JSON.stringify(payload));
  } catch (err) {
    console.error('[Agent] Error pushing telemetry:', err.message);
  }
}

async function handleHubCommand(msg) {
  if (!msg.reqId) return;

  const { reqId, type } = msg;

  if (type === 'control_container') {
    const { containerId, action } = msg;
    try {
      const result = await controlContainer(containerId, action);
      ws.send(JSON.stringify({
        type: 'command_response',
        reqId,
        nodeId: config.nodeId,
        success: result.success,
        result
      }));
      // Trigger instant telemetry update
      setTimeout(pushTelemetry, 500);
    } catch (err) {
      ws.send(JSON.stringify({
        type: 'command_response',
        reqId,
        nodeId: config.nodeId,
        success: false,
        error: err.message
      }));
    }
  } else if (type === 'get_container_logs') {
    const { containerId, tail } = msg;
    try {
      const logs = await getContainerLogs(containerId, tail || 100);
      ws.send(JSON.stringify({
        type: 'command_response',
        reqId,
        nodeId: config.nodeId,
        success: true,
        logs
      }));
    } catch (err) {
      ws.send(JSON.stringify({
        type: 'command_response',
        reqId,
        nodeId: config.nodeId,
        success: false,
        error: err.message
      }));
    }
  }
}

// Start Agent
connectToHub();
