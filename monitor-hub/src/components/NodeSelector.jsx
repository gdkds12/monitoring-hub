import React from 'react';
import { Server, Cpu, Database, Box, Network } from 'lucide-react';

export default function NodeSelector({ nodes, activeNodeId, onSelectNode }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '1.2rem', marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        등록된 모니터링 노드 에이전트가 없습니다. 서버에 `monitor-agent`를 실행하세요.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        🌐 등록된 서버 노드 인스턴스 ({nodes.length})
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '0.9rem'
      }}>
        {nodes.map((node) => {
          const isSelected = node.id === activeNodeId;
          const isOnline = node.online;
          const cpu = node.telemetry?.cpu?.overallLoad || 0;
          const ram = node.telemetry?.memory?.usedPercent || 0;

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className="glass-card"
              style={{
                padding: '1rem',
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-card)',
                boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.15)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <span className={isOnline ? 'dot-online' : 'dot-offline'} />
                  <strong style={{ fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node.name || node.id}
                  </strong>
                </div>

                <span className={`badge ${isOnline ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '0.65rem' }}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              {/* Quick Metrics */}
              {isOnline && node.telemetry && (
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div>CPU: <strong className="mono text-cyan">{cpu}%</strong></div>
                  <div>RAM: <strong className="mono text-emerald">{ram}%</strong></div>
                  <div>Docker: <strong className="mono" style={{ color: '#a5b4fc' }}>{node.containers?.length || 0}</strong></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
