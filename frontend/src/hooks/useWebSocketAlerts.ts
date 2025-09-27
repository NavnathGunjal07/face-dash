import { useEffect, useState } from 'react';

const useWebSocketAlerts = (cameraId: string) => {
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    // Dummy WebSocket simulation for demo
    const ws = {
      onmessage: null,
      close: () => {},
    } as any;
    const interval = setInterval(() => {
      const alert = `Face detected on camera ${cameraId} at ${new Date().toLocaleTimeString()}`;
      setAlerts(prev => [alert, ...prev].slice(0, 10));
    }, 5000);
    ws.onmessage = (event: any) => {
      setAlerts(prev => [event.data, ...prev].slice(0, 10));
    };
    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [cameraId]);

  return alerts;
};

export default useWebSocketAlerts;
