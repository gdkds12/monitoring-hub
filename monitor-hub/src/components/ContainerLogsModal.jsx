import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Terminal } from 'lucide-react';

export default function ContainerLogsModal({ nodeId, containerId, containerName, onClose, onRequestLogs }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await onRequestLogs(nodeId, containerId, 100);
      if (res && res.success) {
        setLogs(res.logs || []);
      } else {
        setLogs([`로그 수신 실패: ${res?.error || '오류 발생'}`]);
      }
    } catch (err) {
      setLogs([`로그 수신 오류: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (nodeId && containerId) {
      fetchLogs();
    }
  }, [nodeId, containerId]);

  if (!containerId) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '900px',
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(56, 189, 248, 0.3)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1rem 1.2rem',
          background: 'rgba(0, 0, 0, 0.4)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Terminal size={18} className="text-cyan" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
              원격 Node 로그: <span className="text-cyan">{containerName}</span>
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button className="btn btn-cyan" onClick={fetchLogs} disabled={loading}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              <span>새로고침</span>
            </button>

            <button className="btn btn-rose" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div style={{
          flex: 1,
          padding: '1rem',
          background: '#070a12',
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          lineHeight: '1.5',
          color: '#e5e7eb'
        }}>
          {loading && logs.length === 0 ? (
            <div style={{ color: 'var(--accent-cyan)' }}>원격 노드에서 로그를 요청하는 중입니다...</div>
          ) : logs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>출력할 로그가 없습니다.</div>
          ) : (
            logs.map((line, idx) => (
              <div 
                key={idx} 
                style={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-all',
                  color: line.toLowerCase().includes('error') ? '#f87171' : 
                         line.toLowerCase().includes('warn') ? '#fbbf24' : '#e5e7eb'
                }}
              >
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
