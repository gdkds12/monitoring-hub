import React, { useState } from 'react';
import { 
  Box, 
  Play, 
  Square, 
  RotateCw, 
  FileText, 
  Search, 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';

export default function DockerHub({ nodeId, containers = [], onControlContainer, onViewLogs }) {
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [loadingContainerId, setLoadingContainerId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAction = async (id, name, action) => {
    setLoadingContainerId(id);
    try {
      const res = await onControlContainer(nodeId, id, action);
      if (res && res.success) {
        showToast(`[${name}] ${action} 명령이 노드로 전달되었습니다.`, 'success');
      } else {
        showToast(`[${name}] ${action} 실패: ${res?.error || '오류 발생'}`, 'error');
      }
    } catch (err) {
      showToast(`오류 발생: ${err.message}`, 'error');
    } finally {
      setLoadingContainerId(null);
    }
  };

  const totalCount = containers.length;
  const runningContainers = containers.filter(c => c.state === 'running');
  const runningCount = runningContainers.length;
  const stoppedCount = totalCount - runningCount;

  const totalCpu = runningContainers.reduce((acc, c) => acc + (c.stats?.cpuPercent || 0), 0).toFixed(1);
  const totalMem = runningContainers.reduce((acc, c) => acc + (c.stats?.memoryUsageBytes || 0), 0);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const sortedContainers = [...containers].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'name') {
      valA = a.name; valB = b.name;
    } else if (sortBy === 'cpu') {
      valA = a.stats?.cpuPercent || 0; valB = b.stats?.cpuPercent || 0;
    } else if (sortBy === 'memory') {
      valA = a.stats?.memoryUsageBytes || 0; valB = b.stats?.memoryUsageBytes || 0;
    } else if (sortBy === 'state') {
      valA = a.state; valB = b.state;
    }
    
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredContainers = sortedContainers.filter(c => 
    c.name.toLowerCase().includes(filterText.toLowerCase()) ||
    c.image.toLowerCase().includes(filterText.toLowerCase()) ||
    c.state.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          background: toastMessage.type === 'error' ? 'var(--accent-rose)' : 'var(--accent-emerald)',
          color: '#fff',
          padding: '0.75rem 1.2rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600,
          fontSize: '0.875rem'
        }}>
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Header & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Box size={20} className="text-cyan" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Docker 컨테이너 관제 및 원격 RPC 제어</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span className="badge badge-indigo">전체: {totalCount}</span>
          <span className="badge badge-emerald">실행 중: {runningCount}</span>
          <span className="badge badge-rose">중지됨: {stoppedCount}</span>
          <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--text-primary)' }}>
            총 CPU: <span className="text-cyan" style={{marginLeft:'4px'}}>{totalCpu}%</span>
          </span>
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-emerald)', color: 'var(--text-primary)' }}>
            총 RAM: <span className="text-emerald" style={{marginLeft:'4px'}}>{formatBytes(totalMem)}</span>
          </span>
        </div>
      </div>

      {/* Search Bar & Sorting Controls */}
      <div style={{ marginBottom: '1.2rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder="컨테이너 이름, 이미지 검색..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.8rem 0.55rem 2.2rem',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>
        
        <select 
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            padding: '0.55rem',
            fontSize: '0.85rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="name">이름순 정렬</option>
          <option value="cpu">CPU 사용량순</option>
          <option value="memory">메모리 사용량순</option>
          <option value="state">상태순 (실행 여부)</option>
        </select>

        <button 
          className="btn"
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          style={{ padding: '0.55rem 0.8rem' }}
        >
          {sortOrder === 'asc' ? '오름차순 ↑' : '내림차순 ↓'}
        </button>
      </div>

      {/* Containers Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1rem'
      }}>
        {filteredContainers.map((c) => {
          const isRunning = c.state === 'running';
          const isPending = loadingContainerId === c.id;
          const stats = c.stats || {};

          return (
            <div 
              key={c.id}
              style={{
                background: 'rgba(0, 0, 0, 0.22)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                gap: '0.8rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <span className={isRunning ? 'dot-online' : 'dot-offline'} />
                    <strong style={{ fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.name}
                    </strong>
                  </div>

                  <span className={`badge ${isRunning ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '0.65rem' }}>
                    {c.state}
                  </span>
                </div>

                <p className="mono" style={{ fontSize: '0.725rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.image}
                </p>
              </div>

              {/* Live Telemetry */}
              {isRunning && (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.775rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>CPU:</span>
                    <strong className="mono text-cyan">{stats.cpuPercent || 0}%</strong>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: '0.5rem', height: '4px' }}>
                    <div className="progress-fill" style={{ width: `${Math.min(100, stats.cpuPercent || 0)}%`, backgroundColor: 'var(--accent-cyan)' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>RAM:</span>
                    <strong className="mono text-emerald">{formatBytes(stats.memoryUsageBytes)} ({stats.memoryPercent || 0}%)</strong>
                  </div>
                  <div className="progress-bar" style={{ height: '4px' }}>
                    <div className="progress-fill" style={{ width: `${Math.min(100, stats.memoryPercent || 0)}%`, backgroundColor: 'var(--accent-emerald)' }} />
                  </div>
                </div>
              )}

              {/* Port Mappings */}
              {c.ports && c.ports.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {c.ports.map((p, idx) => (
                    <span key={idx} className="badge badge-indigo" style={{ fontSize: '0.65rem', textTransform: 'none' }}>
                      {p.publicPort}:{p.privatePort}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
                {isRunning ? (
                  <>
                    <button 
                      className="btn btn-amber"
                      disabled={isPending}
                      onClick={() => handleAction(c.id, c.name, 'restart')}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <RotateCw size={13} />
                      <span>재시작</span>
                    </button>

                    <button 
                      className="btn btn-rose"
                      disabled={isPending}
                      onClick={() => handleAction(c.id, c.name, 'stop')}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <Square size={13} />
                      <span>중지</span>
                    </button>
                  </>
                ) : (
                  <button 
                    className="btn btn-emerald"
                    disabled={isPending}
                    onClick={() => handleAction(c.id, c.name, 'start')}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Play size={13} />
                    <span>시작</span>
                  </button>
                )}

                <button 
                  className="btn"
                  onClick={() => onViewLogs(nodeId, c.id, c.name)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <FileText size={13} />
                  <span>로그</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
