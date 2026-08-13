import React from 'react';
import { Cpu, HardDrive, Database, ArrowDown, ArrowUp, Zap } from 'lucide-react';

export default function OverviewCards({ telemetry }) {
  if (!telemetry) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        노드 텔레메트리 데이터를 수신 대기 중입니다...
      </div>
    );
  }

  const { cpu, memory, disk, network } = telemetry;

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
    if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
    return (bytesPerSec / (1024 * 1024)).toFixed(2) + ' MB/s';
  };

  const getProgressColor = (percent) => {
    if (percent > 85) return 'var(--accent-rose)';
    if (percent > 65) return 'var(--accent-amber)';
    return 'var(--accent-cyan)';
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '1.2rem',
      marginBottom: '1.5rem'
    }}>
      {/* CPU Card */}
      <div className="glass-card" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>CPU 사용률</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.2rem', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span>{cpu.overallLoad}%</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                ({cpu.cores} Cores)
              </span>
            </div>
          </div>
          <div style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
            <Cpu size={20} />
          </div>
        </div>

        <div className="progress-bar" style={{ marginBottom: '0.8rem' }}>
          <div className="progress-fill" style={{ width: `${cpu.overallLoad}%`, backgroundColor: getProgressColor(cpu.overallLoad) }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>User: <strong style={{ color: 'var(--text-primary)' }}>{cpu.userLoad}%</strong></span>
          <span>Sys: <strong style={{ color: 'var(--text-primary)' }}>{cpu.systemLoad}%</strong></span>
          <span>Brand: <strong style={{ color: 'var(--text-primary)' }}>{cpu.brand}</strong></span>
        </div>
      </div>

      {/* RAM Card */}
      <div className="glass-card" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>메모리 (RAM)</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.2rem', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span>{memory.usedPercent}%</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                ({formatBytes(memory.usedBytes)} / {formatBytes(memory.totalBytes)})
              </span>
            </div>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
            <Database size={20} />
          </div>
        </div>

        <div className="progress-bar" style={{ marginBottom: '0.8rem' }}>
          <div className="progress-fill" style={{ width: `${memory.usedPercent}%`, backgroundColor: getProgressColor(memory.usedPercent) }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>여유 메모리: <strong style={{ color: 'var(--text-primary)' }}>{formatBytes(memory.freeBytes)}</strong></span>
        </div>
      </div>

      {/* Storage Card */}
      <div className="glass-card" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>디스크 공간 (Root /)</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.2rem', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span>{disk.usedPercent}%</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                ({formatBytes(disk.usedBytes)} / {formatBytes(disk.sizeBytes)})
              </span>
            </div>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
            <HardDrive size={20} />
          </div>
        </div>

        <div className="progress-bar" style={{ marginBottom: '0.8rem' }}>
          <div className="progress-fill" style={{ width: `${disk.usedPercent}%`, backgroundColor: getProgressColor(disk.usedPercent) }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>사용 가능: <strong style={{ color: 'var(--text-primary)' }}>{formatBytes(disk.freeBytes)}</strong></span>
        </div>
      </div>

      {/* Network Speed Card */}
      <div className="glass-card" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>네트워크 실시간 대역폭</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-emerald)' }}>
                <ArrowDown size={16} />
                <span className="mono" style={{ fontSize: '1.1rem' }}>{formatSpeed(network.rxSecBytes)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)' }}>
                <ArrowUp size={16} />
                <span className="mono" style={{ fontSize: '1.1rem' }}>{formatSpeed(network.txSecBytes)}</span>
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
            <Zap size={20} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.6rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
          <span>인터페이스: <strong style={{ color: 'var(--text-primary)' }}>{network.iface}</strong></span>
        </div>
      </div>
    </div>
  );
}
