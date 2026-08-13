import React from 'react';
import { Server, Activity, Box, Network, Globe } from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  isConnected, 
  activeNode 
}) {
  return (
    <header className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            color: 'var(--accent-cyan)',
            padding: '0.6rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <Globe size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 className="text-gradient" style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Cloudflare DO Multi-Server Master Telemetry Hub
              </h1>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              선택된 노드: <strong style={{ color: 'var(--accent-cyan)' }}>{activeNode?.name || '노드를 선택하세요'}</strong>
            </p>
          </div>
        </div>

        {/* Master WebSocket Connection Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}>
          {isConnected ? (
            <>
              <span className="dot-online" />
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Durable Object Edge Live</span>
            </>
          ) : (
            <>
              <span className="dot-offline" />
              <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>DO Hub Connecting...</span>
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      {activeNode && (
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginTop: '1.2rem', 
          borderTop: '1px solid var(--border-subtle)', 
          paddingTop: '0.8rem' 
        }}>
          <button
            className={`btn ${activeTab === 'overview' ? 'btn-cyan' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={15} />
            <span>시스템 개요</span>
          </button>

          <button
            className={`btn ${activeTab === 'docker' ? 'btn-cyan' : ''}`}
            onClick={() => setActiveTab('docker')}
          >
            <Box size={15} />
            <span>Docker 컨테이너 ({activeNode.containers?.length || 0})</span>
          </button>

          <button
            className={`btn ${activeTab === 'ports' ? 'btn-cyan' : ''}`}
            onClick={() => setActiveTab('ports')}
          >
            <Network size={15} />
            <span>포트 토폴로지 ({activeNode.ports?.length || 0})</span>
          </button>
        </div>
      )}
    </header>
  );
}
