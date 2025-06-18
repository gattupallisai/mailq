import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Utility function to handle JWT token
const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  }
};

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token validity with backend
      axios.get('http://localhost:3000/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(() => navigate('/'))
      .catch(() => setAuthToken(null));
    }
  }, [navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!form.password) {
      newErrors.password = 'Password is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError('');

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', form);
      const { token, user } = response.data;
      
      // Store token and set auth header
      setAuthToken(token);
      
      // Store user data if needed
      localStorage.setItem('user', JSON.stringify(user));
      
      // Redirect to dashboard or home
      navigate('/');
    } catch (error) {
      setApiError(
        error.response?.data?.message || 
        'An error occurred during login. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - 70% */}
      <div
        className="w-[70%] hidden md:flex flex-col justify-center items-start p-16 bg-blue-900 relative text-white"
        style={{
          backgroundImage: `url('https://img.freepik.com/free-vector/connected-world-concept-illustration_114360-3027.jpg?uid=R89080979&ga=GA1.1.1518025770.1742535796&semt=ais_hybrid&w=740')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50 opacity-80 z-0"></div>
        <div className="z-10 relative max-w-xl space-y-1">
          <Mail size={60} className="text-white" />
          <h1 className="text-4xl font-bold leading-snug">
            Welcome to <span className="text-white font-semibold text-6xl">CQ Mail</span>
          </h1>
          <p className="text-lg">
            Your reliable and secure email service crafted for professionals and teams. Seamless, smart, and spam-free.
          </p>
        </div>
      </div>

      {/* Right Panel - 30% */}
      <div className="w-full md:w-[30%] flex items-center justify-center bg-white p-8 shadow-xl">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-blue-700">Login</h2>
            <p className="text-gray-500 text-sm mt-1">Secure access to your CQ Mail account</p>
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-700">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={`w-full mt-1 px-4 py-2 border ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 ${
                  errors.email ? 'focus:ring-red-400' : 'focus:ring-blue-400'
                }`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className={`w-full mt-1 px-4 py-2 border ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 ${
                  errors.password ? 'focus:ring-red-400' : 'focus:ring-blue-400'
                }`}
                placeholder="••••••••"
              />
              {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-blue-600 text-white py-2 rounded-lg transition font-semibold ${
                isLoading 
                  ? 'opacity-70 cursor-not-allowed' 
                  : 'hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center text-sm text-gray-600">
            <Link to="/forgotpassword" className="text-blue-600 hover:underline">
              Forgot your password?
            </Link>
          </div>

          <div className="mt-6 border-t pt-4 text-sm text-gray-700">
            <p>
              New to CQ Mail?{' '}
              <Link to="/signup" className="text-blue-600 hover:underline font-medium">
                Create an account
              </Link>
            </p>
            <p className="mt-1">
              Or choose a{' '}
              <Link to="/plans" className="text-blue-600 hover:underline">
                plan that fits your needs
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 