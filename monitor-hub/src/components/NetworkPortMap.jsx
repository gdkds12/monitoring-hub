import React, { useState } from 'react';
import { Network, Shield, Lock, Globe, Box } from 'lucide-react';

export default function NetworkPortMap({ ports = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'ALL', label: '전체 포트' },
    { id: 'docker', label: 'Docker 바인딩' },
    { id: 'tailscale', label: 'Tailscale VPN' },
    { id: 'webserver', label: 'Caddy 웹서버' },
    { id: 'ssh', label: 'SSH 접속' },
    { id: 'system', label: '시스템 서비스' }
  ];

  const filteredPorts = ports.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = 
      p.port.toString().includes(searchTerm) ||
      p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.processName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ip.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  const getIpBadge = (ip) => {
    if (ip === '0.0.0.0' || ip === '::') {
      return <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}><Globe size={11} /> 외부 (0.0.0.0)</span>;
    }
    if (ip === '127.0.0.1' || ip === '127.0.0.53' || ip === '::1') {
      return <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}><Lock size={11} /> 로컬 (127.0.0.1)</span>;
    }
    return <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}><Shield size={11} /> {ip}</span>;
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Network size={20} className="text-cyan" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>리눅스 네트워크 바인딩 & 포트 매핑 토폴로지</h2>
        </div>
        <span className="badge badge-cyan">총 {ports.length} 개 수신 포트</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`btn ${selectedCategory === cat.id ? 'btn-cyan' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
              style={{ fontSize: '0.775rem', padding: '0.35rem 0.65rem' }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="포트 번호, 프로세스 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '0.4rem 0.8rem',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>포트 #</th>
              <th style={{ padding: '0.75rem' }}>프로토콜</th>
              <th style={{ padding: '0.75rem' }}>바인딩 IP</th>
              <th style={{ padding: '0.75rem' }}>프로세스</th>
              <th style={{ padding: '0.75rem' }}>연결된 컨테이너 / 상세정보</th>
            </tr>
          </thead>
          <tbody>
            {filteredPorts.map((p, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '0.75rem' }}>
                  <span className="mono text-cyan" style={{ fontSize: '1rem', fontWeight: 700 }}>:{p.port}</span>
                </td>
                <td style={{ padding: '0.75rem' }}><span className="mono">{p.protocol}</span></td>
                <td style={{ padding: '0.75rem' }}>{getIpBadge(p.ip)}</td>
                <td style={{ padding: '0.75rem' }}><strong>{p.processName}</strong></td>
                <td style={{ padding: '0.75rem' }}>
                  {p.dockerInfo ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Box size={14} className="text-cyan" />
                      <strong className="text-cyan">{p.dockerInfo.containerName}</strong>
                      <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(:{p.dockerInfo.privatePort})</span>
                    </div>
                  ) : (
                    <span>{p.label}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
