import React, { useState } from 'react';
import { api } from '../../services/api';
import { AppUser, Role } from '../../types';

interface LoginProps {
  onLogin: (user: AppUser) => void;
  onForgotPassword?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>(Role.Customer);

  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      let user;
      if (isSignUp) {
        user = await api.register(email, password, role, fullName);
        setMessage('Registration successful! Please sign in.');
        setIsSignUp(false); // Switch to sign in view after registration
      } else {
        user = await api.login(email, password);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Company Information */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                <img 
                  src="https://media.licdn.com/dms/image/v2/D4D0BAQEhQa-81ecWbA/company-logo_200_200/B4DZV0W24aGcAM-/0/1741413904313/a1_fence_products_company_pvt_ltd_logo?e=2147483647&v=beta&t=gbF26_W-5uA97fp_v7K6f_N49hL6ZKxD8v_wG1xTz9Y" 
                  alt="A1 Fence Services Logo" 
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                A1 Fence Services
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Your trusted partner for premium fencing solutions and exceptional customer service.
              </p>
            </div>

            {/* Services Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Professional Installation</h3>
                <p className="text-gray-600 dark:text-gray-300 text-xs">Expert fence installation with quality materials.</p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">24/7 Support</h3>
                <p className="text-gray-600 dark:text-gray-300 text-xs">Round-the-clock customer support.</p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Competitive Pricing</h3>
                <p className="text-gray-600 dark:text-gray-300 text-xs">Fair and transparent pricing.</p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Warranty Protection</h3>
                <p className="text-gray-600 dark:text-gray-300 text-xs">Comprehensive warranty coverage.</p>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold mb-1">500+</div>
                  <div className="text-primary-100 text-xs">Happy Customers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold mb-1">15+</div>
                  <div className="text-primary-100 text-xs">Years Experience</div>
                </div>
                <div>
                  <div className="text-2xl font-bold mb-1">100%</div>
                  <div className="text-primary-100 text-xs">Satisfaction</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                    {isSignUp ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {isSignUp ? 'Sign up to start your service request.' : 'Sign in to access your dashboard.'}
                  </p>
                </div>
                
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">{error}</div>}
                {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4" role="alert">{message}</div>}

                <form onSubmit={handleAuth} className="space-y-6">
                  {isSignUp && (
                     <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                    </div>
                  )}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                  </div>
                  
                  {isSignUp && (
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Account Type
                      </label>
                      <select
                        id="role"
                        value={role}
                        onChange={e => setRole(e.target.value as Role)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      >
                        <option value={Role.Customer}>Customer</option>
                      </select>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Only customer accounts can be created here. Admin, service, and partner accounts are managed separately.
                      </p>
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {loading ? (isSignUp ? 'Signing Up...' : 'Signing In...') : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                  </div>

                  {!isSignUp && onForgotPassword && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={onForgotPassword}
                        className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  )}
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                      className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                    >
                      {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                  </p>
                </div>
                
                {!isSignUp && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-3">Demo Accounts:</p>
                    <div className="text-xs text-blue-600 dark:text-blue-400 space-y-2">
                      <div className="flex justify-between">
                        <span>Admin:</span>
                        <span>admin@test.com / admin123</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service:</span>
                        <span>service@test.com / service123</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Partner:</span>
                        <span>partner@test.com / partner123</span>
                      </div>
                      <div className="flex justify-between">
                        <span>EPR:</span>
                        <span>epr@test.com / epr123</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;