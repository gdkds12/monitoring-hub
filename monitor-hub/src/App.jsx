import React, { useState, useEffect, useRef } from 'react';
import NodeSelector from './components/NodeSelector';
import Header from './components/Header';
import OverviewCards from './components/OverviewCards';
import CpuDetailGauge from './components/CpuDetailGauge';
import DockerHub from './components/DockerHub';
import NetworkPortMap from './components/NetworkPortMap';
import ContainerLogsModal from './components/ContainerLogsModal';

export default function App() {
  const [nodesMap, setNodesMap] = useState(new Map());
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isConnected, setIsConnected] = useState(false);
  const [logModal, setLogModal] = useState(null);

  const wsRef = useRef(null);
  const pendingRequests = useRef(new Map());

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/dashboard`;

    function connect() {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'snapshot') {
            const newMap = new Map();
            (msg.nodes || []).forEach(n => newMap.set(n.id, n));
            setNodesMap(newMap);
            
            setActiveNodeId(prev => {
              if (!prev && newMap.size > 0) return Array.from(newMap.keys())[0];
              return prev;
            });
          } else if (msg.type === 'node_update') {
            setNodesMap(prev => {
              const updated = new Map(prev);
              updated.set(msg.nodeId, msg.data);
              return updated;
            });
            setActiveNodeId(prev => prev ? prev : msg.nodeId);
          } else if (msg.type === 'node_deleted') {
            setNodesMap(prev => {
              const updated = new Map(prev);
              updated.delete(msg.nodeId);
              return updated;
            });
            setActiveNodeId(prev => (prev === msg.nodeId ? null : prev));
          } else if (msg.type === 'command_response') {
            const resolver = pendingRequests.current.get(msg.reqId);
            if (resolver) {
              resolver(msg);
              pendingRequests.current.delete(msg.reqId);
            }
          }
        } catch (err) {
          console.error('WebSocket parse error:', err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        setIsConnected(false);
      };
    }

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const sendRpc = (payload) => {
    return new Promise((resolve) => {
      const reqId = 'req_' + Math.random().toString(36).substr(2, 9);
      pendingRequests.current.set(reqId, resolve);
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ ...payload, reqId }));
      } else {
        resolve({ success: false, error: 'WebSocket not connected to Durable Object Hub' });
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        if (pendingRequests.current.has(reqId)) {
          pendingRequests.current.delete(reqId);
          resolve({ success: false, error: 'RPC request timed out' });
        }
      }, 10000);
    });
  };

  const handleDeleteNode = (nodeId) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'delete_node',
      nodeId
    }));
  };

  const handleControlContainer = (nodeId, containerId, action) => {
    return sendRpc({
      type: 'control_container',
      nodeId,
      containerId,
      action
    });
  };

  const handleRequestLogs = (nodeId, containerId, tail = 100) => {
    return sendRpc({
      type: 'get_container_logs',
      nodeId,
      containerId,
      tail
    });
  };

  const nodesList = Array.from(nodesMap.values());
  const activeNode = activeNodeId ? nodesMap.get(activeNodeId) : nodesList[0];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        activeNode={activeNode}
      />

      {/* Multi-Node Selector Bar */}
      <NodeSelector
        nodes={nodesList}
        activeNodeId={activeNodeId}
        onSelectNode={(id) => setActiveNodeId(id)}
        onDeleteNode={handleDeleteNode}
      />

      {/* Main Focus Node Content */}
      {activeNode && (
        <main>
          {activeTab === 'overview' && (
            <>
              <OverviewCards telemetry={activeNode.telemetry} />
              <CpuDetailGauge cpu={activeNode.telemetry?.cpu} />
              <DockerHub 
                nodeId={activeNode.id}
                containers={activeNode.containers} 
                onControlContainer={handleControlContainer}
                onViewLogs={(nId, cId, name) => setLogModal({ nodeId: nId, containerId: cId, name })}
              />
            </>
          )}

          {activeTab === 'docker' && (
            <DockerHub 
              nodeId={activeNode.id}
              containers={activeNode.containers} 
              onControlContainer={handleControlContainer}
              onViewLogs={(nId, cId, name) => setLogModal({ nodeId: nId, containerId: cId, name })}
            />
          )}

          {activeTab === 'ports' && (
            <NetworkPortMap ports={activeNode.ports} />
          )}
        </main>
      )}

      {/* Container Logs Modal */}
      {logModal && (
        <ContainerLogsModal
          nodeId={logModal.nodeId}
          containerId={logModal.containerId}
          containerName={logModal.name}
          onClose={() => setLogModal(null)}
          onRequestLogs={handleRequestLogs}
        />
      )}
    </div>
  );
}
