import React from 'react';
import { Cpu } from 'lucide-react';

export default function CpuDetailGauge({ cpu }) {
  if (!cpu || !cpu.coresLoad) return null;

  const getCoreColor = (load) => {
    if (load > 85) return 'var(--accent-rose)';
    if (load > 60) return 'var(--accent-amber)';
    return 'var(--accent-cyan)';
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Cpu size={18} className="text-cyan" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>개별 CPU 코어 모니터링 ({cpu.cores} Cores)</h3>
        </div>
        <span className="badge badge-cyan">
          {cpu.manufacturer} {cpu.brand}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem'
      }}>
        {cpu.coresLoad.map((c) => (
          <div 
            key={c.core} 
            style={{ 
              background: 'rgba(0, 0, 0, 0.25)', 
              padding: '0.9rem', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600 }}>Core #{c.core}</span>
              <span className="mono" style={{ color: getCoreColor(c.load), fontWeight: 700 }}>
                {c.load}%
              </span>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${c.load}%`,
                  backgroundColor: getCoreColor(c.load)
                }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
