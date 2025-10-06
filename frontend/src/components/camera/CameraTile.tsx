import { useState, useEffect } from 'react';
import type { Camera } from '../../store/cameraSlice';
import useWebSocketAlerts from '../../hooks/useWebSocketAlerts';
import VideoPlayer from './VideoPlayer';
import axios from '../../api/axiosInstance';

interface Props {
  camera: Camera;
}

const CameraTile = ({ camera }: Props) => {
  const [streaming, setStreaming] = useState(true);
  const [faceDetection, setFaceDetection] = useState(true);
  const [fps, setFps] = useState(30);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<any>(null);
  const { alerts, isConnected } = useWebSocketAlerts(camera.id);

  const handleStreamError = (error: Error) => {
    setStreamError(error.message);
    setStreaming(false);
  };

  const startStream = async () => {
    try {
      setStreamError(null);
      const response = await axios.post(`/api/cameras/${camera.id}/start`);
      if (response.data.started) {
        setStreaming(true);
        // Poll for stream status
        pollStreamStatus();
      }
    } catch (error: any) {
      setStreamError(error.response?.data?.error || 'Failed to start stream');
    }
  };

  const stopStream = async () => {
    try {
      await axios.post(`/api/cameras/${camera.id}/stop`);
      setStreaming(false);
      setStreamStatus(null);
    } catch (error: any) {
      setStreamError(error.response?.data?.error || 'Failed to stop stream');
    }
  };

  const pollStreamStatus = async () => {
    try {
      const response = await axios.get(`/api/cameras/${camera.id}/status`);
      setStreamStatus(response.data.status);
    } catch (error) {
      console.error('Failed to get stream status:', error);
    }
  };

  useEffect(() => {
    if (streaming) {
      const interval = setInterval(pollStreamStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [streaming, camera.id]);

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-100">{camera.name}</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">{camera.location}</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                 title={isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'} />
          </div>
        </div>

        <div className="relative mb-4">
          {streaming ? (
            <VideoPlayer
              cameraId={camera.id}
              onError={handleStreamError}
            />
          ) : (
            <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-lg">
              <div className="text-gray-600">
                {streamError ? (
                  <div className="text-red-500 text-center p-4">
                    <div className="mb-2">Error: {streamError}</div>
                    <button 
                      onClick={() => setStreamError(null)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Clear Error
                    </button>
                  </div>
                ) : (
                  'Click Start to view camera feed'
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stream Status */}
        {streamStatus && (
          <div className="mb-4 p-2 bg-gray-900 rounded text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">FPS:</span>
              <span className="text-green-400">{streamStatus.fps?.toFixed(1) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Frames:</span>
              <span className="text-blue-400">{streamStatus.frame_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Uptime:</span>
              <span className="text-yellow-400">{streamStatus.uptime?.toFixed(0)}s</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className={`px-3 py-1 rounded ${
              streaming 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800`}
            onClick={streaming ? stopStream : startStream}
          >
            {streaming ? 'Stop' : 'Start'}
          </button>

          <button
            className={`px-3 py-1 rounded ${
              faceDetection 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-600 hover:bg-gray-700'
            } text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800`}
            onClick={() => setFaceDetection(f => !f)}
            disabled={!streaming}
          >
            {faceDetection ? 'Face Detection On' : 'Face Detection Off'}
          </button>

          <div className="flex items-center space-x-2">
            <label className="text-gray-300 text-sm">FPS:</label>
            <input
              type="number"
              min={1}
              max={60}
              value={fps}
              onChange={e => setFps(Number(e.target.value))}
              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-blue-500"
              disabled={!streaming}
            />
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Recent Alerts:</h4>
            <ul className="text-sm max-h-24 overflow-y-auto bg-gray-900 rounded-lg p-2">
              {alerts.map((alert) => (
                <li key={alert.id} className="text-red-400 mb-1 last:mb-0">
                  <div className="text-xs text-gray-500">
                    {new Date(alert.detectedAt).toLocaleTimeString()}
                  </div>
                  {alert.description}
                  {alert.snapshotUrl && (
                    <div className="mt-1">
                      <img 
                        src={`${import.meta.env.VITE_BACKEND_API_BASE_URL}${alert.snapshotUrl}`}
                        alt="Alert snapshot"
                        className="w-16 h-12 object-cover rounded"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraTile;
