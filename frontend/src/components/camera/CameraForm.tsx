import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addCamera } from '../../store/cameraSlice';

const CameraForm = () => {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(addCamera({
      id: Math.random().toString(36).substr(2, 9),
      name,
      location,
      rtspUrl,
    }));
    setName('');
    setLocation('');
    setRtspUrl('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Add Camera</h2>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
        required
      />
      <input
        type="text"
        placeholder="Location"
        value={location}
        onChange={e => setLocation(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
        required
      />
      <input
        type="text"
        placeholder="RTSP URL"
        value={rtspUrl}
        onChange={e => setRtspUrl(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
        required
      />
      <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">Add Camera</button>
    </form>
  );
};

export default CameraForm;
