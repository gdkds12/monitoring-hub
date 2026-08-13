/**
 * Cloudflare Worker + Durable Object for Multi-Node Server Telemetry Hub
 */

export class ServerRegistry {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.agents = new Map(); // nodeId -> WebSocket
    this.dashboards = new Set(); // WebSockets of dashboard clients
    this.nodeStates = new Map(); // nodeId -> latest telemetry data
    this.pendingCommands = new Map(); // reqId -> dashboard WebSocket
    
    // Watchdog to clean up zombie connections
    this.watchdogInterval = setInterval(() => this.runWatchdog(), 15000);
  }

  runWatchdog() {
    const now = Date.now();
    for (const [nodeId, state] of this.nodeStates.entries()) {
      // If node is online but hasn't pinged in 20 seconds, it's a zombie
      if (state.online && (now - state.timestamp > 20000)) {
        console.log(`[DO Registry] Node ${nodeId} timed out. Marking offline.`);
        state.online = false;
        
        const socket = this.agents.get(nodeId);
        if (socket) {
          try { socket.close(); } catch (e) {}
          this.agents.delete(nodeId);
        }

        this.broadcastToDashboards({
          type: 'node_update',
          nodeId,
          data: state
        });
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);

    // 1. Agent WebSocket Endpoint
    if (url.pathname === '/ws/agent') {
      const nodeId = url.searchParams.get('nodeId') || 'unknown';
      const name = url.searchParams.get('name') || nodeId;
      const token = url.searchParams.get('token');

      // Simple token check
      if (token && token !== 'antigravity-monitor-secret-key-2026') {
        return new Response('Unauthorized token', { status: 401 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleAgentSocket(server, nodeId, name);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // 2. Dashboard WebSocket Endpoint
    if (url.pathname === '/ws/dashboard') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleDashboardSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // 3. HTTP API: Get all nodes summary
    if (url.pathname === '/api/nodes') {
      const nodes = Array.from(this.nodeStates.entries()).map(([id, state]) => ({
        id,
        name: state.name || id,
        online: this.agents.has(id),
        lastSeen: state.timestamp,
        telemetry: state.telemetry,
        containersCount: state.containers?.length || 0,
        portsCount: state.ports?.length || 0
      }));
      return new Response(JSON.stringify(nodes), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  handleAgentSocket(socket, nodeId, name) {
    socket.accept();
    this.agents.set(nodeId, socket);
    console.log(`[DO Registry] Agent connected: ${nodeId} (${name})`);

    // Inform the new agent whether it should sleep or send telemetry immediately
    socket.send(JSON.stringify({ type: 'dashboard_status', active: this.dashboards.size > 0 }));

    socket.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'ping') {
          if (this.nodeStates.has(nodeId)) {
            this.nodeStates.get(nodeId).timestamp = Date.now();
          }
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (msg.type === 'telemetry') {
          this.nodeStates.set(nodeId, {
            id: nodeId,
            name: msg.name || name,
            telemetry: msg.telemetry,
            containers: msg.containers,
            ports: msg.ports,
            timestamp: msg.timestamp || Date.now(),
            online: true
          });

          // Broadcast to all active dashboards
          this.broadcastToDashboards({
            type: 'node_update',
            nodeId,
            data: this.nodeStates.get(nodeId)
          });
        } else if (msg.type === 'command_response') {
          const dashboardSocket = this.pendingCommands.get(msg.reqId);
          if (dashboardSocket) {
            dashboardSocket.send(JSON.stringify(msg));
            this.pendingCommands.delete(msg.reqId);
          }
        }
      } catch (err) {
        console.error('[DO Registry] Agent message error:', err);
      }
    });

    socket.addEventListener('close', () => {
      console.log(`[DO Registry] Agent disconnected: ${nodeId}`);
      this.agents.delete(nodeId);
      
      if (this.nodeStates.has(nodeId)) {
        const currentState = this.nodeStates.get(nodeId);
        currentState.online = false;
        this.broadcastToDashboards({
          type: 'node_update',
          nodeId,
          data: currentState
        });
      }
    });
  }

  handleDashboardSocket(socket) {
    socket.accept();
    this.dashboards.add(socket);
    console.log('[DO Registry] Dashboard client connected');

    // If this is the first dashboard, wake up all agents
    if (this.dashboards.size === 1) {
      this.broadcastToAgents({ type: 'dashboard_status', active: true });
    }

    // Send initial snapshot of all nodes
    const snapshot = Array.from(this.nodeStates.entries()).map(([id, state]) => ({
      ...state,
      online: this.agents.has(id)
    }));
    socket.send(JSON.stringify({ type: 'snapshot', nodes: snapshot }));

    socket.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Forward RPC command to target agent
        if (msg.type === 'control_container' || msg.type === 'get_container_logs') {
          const targetAgent = this.agents.get(msg.nodeId);
          if (targetAgent) {
            this.pendingCommands.set(msg.reqId, socket);
            targetAgent.send(JSON.stringify(msg));
          } else {
            socket.send(JSON.stringify({
              type: 'command_response',
              reqId: msg.reqId,
              success: false,
              error: `Target Node [${msg.nodeId}] is offline or unreachable`
            }));
          }
        }
      } catch (err) {
        console.error('[DO Registry] Dashboard message error:', err);
      }
    });

    socket.addEventListener('close', () => {
      this.dashboards.delete(socket);
      
      // If no dashboards left, tell agents to sleep and stop telemetry
      if (this.dashboards.size === 0) {
        this.broadcastToAgents({ type: 'dashboard_status', active: false });
      }
    });
  }

  broadcastToAgents(payload) {
    const json = JSON.stringify(payload);
    for (const socket of this.agents.values()) {
      try { socket.send(json); } catch {}
    }
  }

  broadcastToDashboards(payload) {
    const json = JSON.stringify(payload);
    for (const socket of this.dashboards) {
      try {
        socket.send(json);
      } catch {
        this.dashboards.delete(socket);
      }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route WebSocket & API requests to Singleton Durable Object instance
    if (url.pathname.startsWith('/ws/') || url.pathname.startsWith('/api/')) {
      const id = env.SERVER_REGISTRY.idFromName('global_registry');
      const obj = env.SERVER_REGISTRY.get(id);
      return obj.fetch(request);
    }

    // Serve static frontend assets
    return env.ASSETS.fetch(request);
  }
};
