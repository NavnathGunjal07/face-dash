import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from '../api/axiosInstance';

interface LocationState {
  message?: string;
}

interface ApiError {
  error: string;
  field?: string;
}

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for success message from registration
    const state = location.state as LocationState;
    if (state?.message) {
      setSuccessMessage(state.message);
      // Clear the message from location state
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    
    try {
      setIsLoading(true);
      const res = await axios.post('/auth/login', { username, password });
      
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        navigate('/dashboard');
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      const apiError = err.response?.data as ApiError;
      if (apiError?.field) {
        // Handle field-specific errors
        setFieldErrors({
          [apiError.field]: apiError.error
        });
      } else {
        // Handle general errors
        setError(apiError?.error || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96 border border-gray-700">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-100">Security Login</h2>
          <p className="mt-2 text-gray-400">Access your surveillance dashboard</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {successMessage && (
            <div className="p-3 bg-green-900 bg-opacity-50 border border-green-700 text-green-400 rounded-md">
              {successMessage}
            </div>
          )}
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={`w-full p-3 bg-gray-700 border ${
                fieldErrors.username ? 'border-red-500' : 'border-gray-600'
              } text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400`}
              required
              disabled={isLoading}
            />
            {fieldErrors.username && (
              <p className="mt-2 text-sm text-red-400">{fieldErrors.username}</p>
            )}
          </div>
          <div className="mb-4">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full p-3 bg-gray-700 border ${
                fieldErrors.password ? 'border-red-500' : 'border-gray-600'
              } text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400`}
              required
              disabled={isLoading}
            />
            {fieldErrors.password && (
              <p className="mt-2 text-sm text-red-400">{fieldErrors.password}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Authenticating...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 text-sm text-center border-t border-gray-700">
          <p className="text-gray-400">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
  export default Login;
