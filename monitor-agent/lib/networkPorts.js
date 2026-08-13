import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { getContainersList } from './dockerMetrics.js';

const execAsync = promisify(exec);

export async function getNetworkPorts() {
  try {
    let stdout = '';
    try {
      const res = await execAsync('sudo ss -tulpn');
      stdout = res.stdout;
    } catch {
      const res = await execAsync('ss -tulpn');
      stdout = res.stdout;
    }

    const containers = await getContainersList();
    const dockerPortMap = new Map();

    for (const container of containers) {
      for (const p of container.ports) {
        if (p.publicPort) {
          dockerPortMap.set(p.publicPort, {
            containerId: container.id,
            containerName: container.name,
            image: container.image,
            state: container.state,
            privatePort: p.privatePort
          });
        }
      }
    }

    const lines = stdout.split('\n').filter(Boolean);
    const ports = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 5) continue;

      const netid = parts[0];
      const state = parts[1];

      let localAddrStr = '';
      let processStr = '';

      for (let p = 3; p < parts.length; p++) {
        if (parts[p].includes(':') && !parts[p].startsWith('users:')) {
          if (!localAddrStr) localAddrStr = parts[p];
        }
        if (parts[p].startsWith('users:')) {
          processStr = parts.slice(p).join(' ');
          break;
        }
      }

      if (!localAddrStr) continue;

      const lastColon = localAddrStr.lastIndexOf(':');
      if (lastColon === -1) continue;

      let ip = localAddrStr.slice(0, lastColon);
      const portStr = localAddrStr.slice(lastColon + 1);
      const port = parseInt(portStr, 10);
      if (isNaN(port)) continue;

      if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
      if (ip.includes('%')) ip = ip.split('%')[0];
      if (!ip) ip = '0.0.0.0';

      let processName = 'Unknown';
      let pid = null;

      if (processStr) {
        const procMatch = processStr.match(/users:\(\("([^"]+)",pid=(\d+)/);
        if (procMatch) {
          processName = procMatch[1];
          pid = parseInt(procMatch[2], 10);
        }
      }

      const dockerMatch = dockerPortMap.get(port);
      let category = 'system';
      let label = processName;

      if (dockerMatch) {
        category = 'docker';
        label = `Docker: ${dockerMatch.containerName}`;
      } else if (processName === 'tailscaled') {
        category = 'tailscale';
        label = 'Tailscale VPN';
      } else if (processName === 'caddy') {
        category = 'webserver';
        label = 'Caddy Web Server';
      } else if (processName === 'sshd') {
        category = 'ssh';
        label = 'SSH Remote Access';
      }

      ports.push({
        protocol: netid.toUpperCase(),
        state,
        ip,
        port,
        processName,
        pid,
        category,
        label,
        dockerInfo: dockerMatch || null
      });
    }

    ports.sort((a, b) => a.port - b.port);
    return ports;
  } catch (err) {
    console.error('Error fetching network ports:', err);
    return [];
  }
}
