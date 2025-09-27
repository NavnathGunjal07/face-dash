import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import AddCamera from '../components/camera/AddCamera';

const Dashboard = () => {
  const navigate = useNavigate();
  const cameras = useSelector((state: RootState) => state.cameras.cameras);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Get user info from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUsername(userData.username);
    }

    // Initial load simulation
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-100">Security Dashboard</h1>
            </div>

            <div className="flex items-center space-x-6">
              <button
                onClick={() => setShowAddCamera(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
              >
                Add Camera
              </button>

              <div className="flex items-center space-x-3 pl-6 border-l border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-200">{username}</span>
                    <span className="text-xs text-gray-400">Admin</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 bg-red-900 bg-opacity-20 rounded-lg p-4">
            {error}
          </div>
        ) : cameras.length === 0 ? (
          <div className="text-center bg-gray-800 rounded-lg p-8">
            <p className="text-gray-400">No cameras added yet.</p>
            <button
              onClick={() => setShowAddCamera(true)}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Add your first camera
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cameras.map((camera) => (
              <div
                key={camera.id}
                className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors"
              >
                {/* Camera Preview Placeholder */}
                <div className="aspect-video bg-gray-900 flex items-center justify-center">
                  <div className="text-gray-600">Camera Feed</div>
                </div>
                
                {/* Camera Info */}
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-100">{camera.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{camera.location}</p>
                  <div className="flex items-center mt-4 space-x-2">
                    <div 
                      className={`w-2 h-2 rounded-full ${
                        camera.rtspUrl ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="text-sm text-gray-400">
                      {camera.rtspUrl ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Camera Modal */}
      {showAddCamera && (
        <AddCamera
          onSuccess={() => {
            setShowAddCamera(false);
            // Trigger camera refresh if needed
          }}
          onCancel={() => setShowAddCamera(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
