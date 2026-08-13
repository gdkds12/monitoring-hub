import si from 'systeminformation';

let prevNetworkStats = null;
let prevNetworkTime = null;

export async function getSystemTelemetry() {
  try {
    const [
      cpu,
      cpuCurrentSpeed,
      mem,
      currentLoad,
      fsSize,
      disksIO,
      networkStats,
      osInfo,
      time
    ] = await Promise.all([
      si.cpu(),
      si.cpuCurrentSpeed(),
      si.mem(),
      si.currentLoad(),
      si.fsSize(),
      si.disksIO(),
      si.networkStats(),
      si.osInfo(),
      si.time()
    ]);

    const coreLoads = (currentLoad.cpus || []).map((c, idx) => ({
      core: idx,
      load: Math.min(100, Math.max(0, Number(c.load.toFixed(1))))
    }));

    const mainDisk = fsSize.find(f => f.mount === '/') || fsSize[0] || { size: 0, used: 0, use: 0 };
    const defaultNet = (networkStats && networkStats[0]) ? networkStats[0] : { rx_bytes: 0, tx_bytes: 0 };
    
    let rxSec = defaultNet.rx_sec || 0;
    let txSec = defaultNet.tx_sec || 0;
    const now = Date.now();

    if (prevNetworkStats && prevNetworkTime) {
      const timeDeltaSec = (now - prevNetworkTime) / 1000;
      if (timeDeltaSec > 0) {
        rxSec = Math.max(0, (defaultNet.rx_bytes - prevNetworkStats.rx_bytes) / timeDeltaSec);
        txSec = Math.max(0, (defaultNet.tx_bytes - prevNetworkStats.tx_bytes) / timeDeltaSec);
      }
    }
    prevNetworkStats = { rx_bytes: defaultNet.rx_bytes, tx_bytes: defaultNet.tx_bytes };
    prevNetworkTime = now;

    return {
      time: new Date().toISOString(),
      uptimeSeconds: time.uptime,
      cpu: {
        manufacturer: cpu.manufacturer || 'ARM',
        brand: cpu.brand || 'Ampere Altra',
        cores: cpu.cores || 4,
        speedGhz: cpuCurrentSpeed.avg || 0,
        overallLoad: Math.min(100, Math.max(0, Number(currentLoad.currentLoad.toFixed(1)))),
        userLoad: Math.min(100, Math.max(0, Number(currentLoad.currentLoadUser.toFixed(1)))),
        systemLoad: Math.min(100, Math.max(0, Number(currentLoad.currentLoadSystem.toFixed(1)))),
        coresLoad: coreLoads
      },
      memory: {
        totalBytes: mem.total,
        usedBytes: mem.active || (mem.total - mem.available),
        freeBytes: mem.available || mem.free,
        usedPercent: Math.min(100, Math.max(0, Number((((mem.active || (mem.total - mem.available)) / mem.total) * 100).toFixed(1)))),
        cachedBytes: mem.cached || 0
      },
      disk: {
        fs: mainDisk.fs,
        type: mainDisk.type,
        sizeBytes: mainDisk.size,
        usedBytes: mainDisk.used,
        freeBytes: mainDisk.available || (mainDisk.size - mainDisk.used),
        usedPercent: Math.min(100, Math.max(0, Number(mainDisk.use.toFixed(1))))
      },
      network: {
        iface: defaultNet.iface || 'eth0',
        rxSecBytes: Math.round(rxSec),
        txSecBytes: Math.round(txSec),
        totalRxBytes: defaultNet.rx_bytes || 0,
        totalTxBytes: defaultNet.tx_bytes || 0
      },
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        hostname: osInfo.hostname
      }
    };
  } catch (err) {
    console.error('Error fetching system telemetry:', err);
    return null;
  }
}
