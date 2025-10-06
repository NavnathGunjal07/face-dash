import { useEffect, useState } from 'react';

interface Alert {
  id: string;
  cameraId: string;
  detectedAt: string;
  description: string;
  snapshotUrl?: string;
  metadata?: any;
  camera: {
    name: string;
    location: string;
  };
}

const useWebSocketAlerts = (cameraId: string) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'alert' && message.data.cameraId === cameraId) {
          setAlerts(prev => [message.data, ...prev].slice(0, 10));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [cameraId]);

  return { alerts, isConnected };
};

export default useWebSocketAlerts;
