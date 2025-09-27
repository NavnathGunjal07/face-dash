import { useState } from 'react';
import axios from '../../api/axiosInstance';

interface AddCameraProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface ApiError {
  error: string;
  field?: string;
}

const AddCamera = ({ onSuccess, onCancel }: AddCameraProps) => {
  const [name, setName] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    try {
      setIsLoading(true);
      await axios.post('/api/cameras', {
        name,
        rtspUrl,
        location
      });
      onSuccess();
    } catch (err: any) {
      const apiError = err.response?.data as ApiError;
      if (apiError?.field) {
        setFieldErrors({ [apiError.field]: apiError.error });
      } else {
        setError(apiError?.error || 'Failed to add camera');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700 shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-100">Add New Camera</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="name">
              Camera Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800 border ${
                fieldErrors.name ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-gray-100 focus:outline-none focus:border-blue-500 transition-colors`}
              placeholder="Enter camera name"
              disabled={isLoading}
              required
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="rtspUrl">
              RTSP URL
            </label>
            <input
              id="rtspUrl"
              type="text"
              value={rtspUrl}
              onChange={(e) => setRtspUrl(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800 border ${
                fieldErrors.rtspUrl ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-gray-100 focus:outline-none focus:border-blue-500 transition-colors`}
              placeholder="rtsp://example.com/stream"
              disabled={isLoading}
              required
            />
            {fieldErrors.rtspUrl && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.rtspUrl}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="location">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800 border ${
                fieldErrors.location ? 'border-red-500' : 'border-gray-600'
              } rounded-md text-gray-100 focus:outline-none focus:border-blue-500 transition-colors`}
              placeholder="Enter camera location"
              disabled={isLoading}
              required
            />
            {fieldErrors.location && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.location}</p>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div className="flex space-x-3 mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors relative"
            >
              {isLoading ? (
                <>
                  <span className="opacity-0">Add Camera</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </>
              ) : (
                'Add Camera'
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCamera;