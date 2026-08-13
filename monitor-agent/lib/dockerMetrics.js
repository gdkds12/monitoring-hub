import http from 'node:http';

export function queryDockerSocket(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const options = {
      socketPath: '/var/run/docker.sock',
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };

    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const raw = buffer.toString('utf8');
        try {
          const json = raw ? JSON.parse(raw) : null;
          resolve({ status: res.statusCode, data: json, raw });
        } catch {
          resolve({ status: res.statusCode, data: null, raw });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ status: 500, error: err.message, data: null });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

export async function getContainersList() {
  const result = await queryDockerSocket('/containers/json?all=true');
  if (result.status !== 200 || !Array.isArray(result.data)) {
    return [];
  }

  return result.data.map(c => {
    const name = (c.Names && c.Names[0]) ? c.Names[0].replace(/^\//, '') : c.Id.slice(0, 12);
    const ports = (c.Ports || []).map(p => ({
      ip: p.IP || '0.0.0.0',
      privatePort: p.PrivatePort,
      publicPort: p.PublicPort,
      type: p.Type
    })).filter(p => p.publicPort);

    return {
      id: c.Id,
      shortId: c.Id.slice(0, 12),
      name,
      image: c.Image,
      state: c.State,
      status: c.Status,
      created: c.Created,
      ports
    };
  });
}

export async function getContainerStats(containerId) {
  const result = await queryDockerSocket(`/containers/${containerId}/stats?stream=false`);
  if (result.status !== 200 || !result.data) {
    return { cpuPercent: 0, memoryUsageBytes: 0, memoryLimitBytes: 0, memoryPercent: 0 };
  }

  const stats = result.data;
  let cpuPercent = 0;
  try {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const onlineCpus = stats.cpu_stats.online_cpus || (stats.cpu_stats.cpu_usage.percpu_usage ? stats.cpu_stats.cpu_usage.percpu_usage.length : 1);

    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent = (cpuDelta / systemDelta) * onlineCpus * 100;
    }
  } catch (e) {
    cpuPercent = 0;
  }

  const memoryUsage = stats.memory_stats?.usage || 0;
  const memoryLimit = stats.memory_stats?.limit || 1;
  const memoryPercent = (memoryUsage / memoryLimit) * 100;

  return {
    cpuPercent: Math.min(100, Math.max(0, Number(cpuPercent.toFixed(1)))),
    memoryUsageBytes: memoryUsage,
    memoryLimitBytes: memoryLimit,
    memoryPercent: Math.min(100, Math.max(0, Number(memoryPercent.toFixed(1))))
  };
}

export async function controlContainer(containerId, action) {
  const validActions = ['start', 'stop', 'restart', 'pause', 'unpause'];
  if (!validActions.includes(action)) {
    throw new Error(`Invalid container action: ${action}`);
  }

  const result = await queryDockerSocket(`/containers/${containerId}/${action}`, 'POST');
  if (result.status === 204 || result.status === 200) {
    return { success: true, action };
  }
  return { success: false, status: result.status, error: result.data?.message || result.error || 'Action failed' };
}

export async function getContainerLogs(containerId, tail = 100) {
  const path = `/containers/${containerId}/logs?stdout=1&stderr=1&timestamps=0&tail=${tail}`;
  const result = await queryDockerSocket(path);
  if (!result.raw) return [];
  
  const lines = [];
  const buffer = Buffer.from(result.raw, 'binary');
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      lines.push(buffer.slice(offset).toString('utf8'));
      break;
    }
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;

    if (offset + size <= buffer.length) {
      const payload = buffer.slice(offset, offset + size).toString('utf8');
      lines.push(...payload.split('\n').filter(Boolean));
      offset += size;
    } else {
      const payload = buffer.slice(offset).toString('utf8');
      lines.push(...payload.split('\n').filter(Boolean));
      break;
    }
  }

  return lines;
}
