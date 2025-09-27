import { useState } from 'react';
import type { Camera } from '../../store/cameraSlice';
import useWebSocketAlerts from '../../hooks/useWebSocketAlerts';

interface Props {
  camera: Camera;
}

const CameraTile = ({ camera }: Props) => {
  const [streaming, setStreaming] = useState(false);
  const [faceDetection, setFaceDetection] = useState(true);
  const [fps, setFps] = useState(30);
  const alerts = useWebSocketAlerts(camera.id);

  return (
    <div className="bg-white rounded shadow p-4 flex flex-col">
      <div className="mb-2 font-bold">{camera.name} ({camera.location})</div>
      <div className="aspect-video bg-black mb-2 flex items-center justify-center">
        {/* Replace with actual WebRTC video feed */}
        <span className="text-white">Live Video</span>
      </div>
      <div className="mb-2">
        <button
          className={`mr-2 px-3 py-1 rounded ${streaming ? 'bg-red-500' : 'bg-green-500'} text-white`}
          onClick={() => setStreaming(s => !s)}
        >
          {streaming ? 'Stop' : 'Start'}
        </button>
        <button
          className={`mr-2 px-3 py-1 rounded ${faceDetection ? 'bg-blue-500' : 'bg-gray-400'} text-white`}
          onClick={() => setFaceDetection(f => !f)}
        >
          {faceDetection ? 'Face Detection On' : 'Face Detection Off'}
        </button>
        <label className="ml-2">
          FPS:
          <input
            type="number"
            min={1}
            max={60}
            value={fps}
            onChange={e => setFps(Number(e.target.value))}
            className="ml-1 w-16 border rounded px-1"
          />
        </label>
      </div>
      <div className="mb-2">
        <div className="font-semibold">Alerts:</div>
        <ul className="text-sm max-h-24 overflow-y-auto">
          {alerts.map((alert, idx) => (
            <li key={idx} className="text-red-600">{alert}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CameraTile;
