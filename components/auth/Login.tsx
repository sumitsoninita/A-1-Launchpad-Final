import React, { useState, useEffect } from 'react';
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
  const [isVisible, setIsVisible] = useState(false);

  // Animation trigger
  useEffect(() => {
    setIsVisible(true);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Optimized Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-60 h-60 sm:w-80 sm:h-80 bg-primary-200 dark:bg-primary-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 animate-float-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-60 h-60 sm:w-80 sm:h-80 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 animate-float-reverse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 sm:w-80 sm:h-80 bg-purple-200 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 animate-float-slow" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="container mx-auto px-4 py-4 sm:py-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8 items-start">
          {/* Left Side - Company Information */}
          <div className="space-y-4 sm:space-y-6 order-2 lg:order-1">
            <div className={`text-center lg:text-left transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-blue-400 rounded-xl blur-lg opacity-30 animate-pulse-glow"></div>
                <img 
                  src="https://media.licdn.com/dms/image/v2/D4D0BAQEhQa-81ecWbA/company-logo_200_200/B4DZV0W24aGcAM-/0/1741413904313/a1_fence_products_company_pvt_ltd_logo?e=2147483647&v=beta&t=gbF26_W-5uA97fp_v7K6f_N49hL6ZKxD8v_wG1xTz9Y" 
                  alt="A1 Fence Services Logo" 
                  className="w-full h-full object-contain rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 relative z-10"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 bg-gradient-to-r from-primary-600 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
                A1 Fence Services
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                Your trusted partner for premium fencing solutions and exceptional customer service.
              </p>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[
                {
                  icon: (
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  ),
                  bgColor: "bg-blue-100 dark:bg-blue-900",
                  title: "Professional Installation",
                  description: "Expert fence installation with quality materials.",
                  delay: "0s"
                },
                {
                  icon: (
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  bgColor: "bg-green-100 dark:bg-green-900",
                  title: "24/7 Support",
                  description: "Round-the-clock customer support.",
                  delay: "0.2s"
                },
                {
                  icon: (
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  ),
                  bgColor: "bg-purple-100 dark:bg-purple-900",
                  title: "Competitive Pricing",
                  description: "Fair and transparent pricing.",
                  delay: "0.4s"
                },
                {
                  icon: (
                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                    </svg>
                  ),
                  bgColor: "bg-orange-100 dark:bg-orange-900",
                  title: "Warranty Protection",
                  description: "Comprehensive warranty coverage.",
                  delay: "0.6s"
                }
              ].map((service, index) => (
                <div 
                  key={index}
                  className={`bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group relative overflow-hidden ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ 
                    transitionDelay: `${parseFloat(service.delay) + 0.5}s`,
                    animationDelay: service.delay
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 ${service.bgColor} rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-105 transition-all duration-300 relative z-10`}>
                    {service.icon}
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300 relative z-10">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-xs group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 relative z-10">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className={`bg-red-800 rounded-lg p-4 sm:p-6 text-white hover:shadow-xl hover:shadow-red-500/25 transition-all duration-300 relative overflow-hidden ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{transitionDelay: '1s'}}>
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center relative z-10">
                {[
                  { number: "1 Lakh+", label: "Happy Customers" },
                  { number: "25+", label: "Years Experience" },
                  { number: "100%", label: "Satisfaction" }
                ].map((stat, index) => (
                  <div key={index} className="group">
                    <div className="text-lg sm:text-2xl font-bold mb-1 group-hover:scale-105 group-hover:text-yellow-200 transition-all duration-300">
                      {stat.number}
                    </div>
                    <div className="text-primary-100 text-xs group-hover:text-white group-hover:font-medium transition-all duration-300">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex justify-center lg:justify-end order-1 lg:order-2">
            <div className="w-full max-w-md">
              <div className={`bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-3xl hover:shadow-primary-500/10 transition-all duration-300 relative overflow-hidden ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`} style={{transitionDelay: '0.3s'}}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-blue-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                <div className="text-center mb-4 sm:mb-6 relative z-10">
                  <h2 className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400 mb-2 bg-gradient-to-r from-primary-600 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
                    {isSignUp ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {isSignUp ? 'Sign up to start your service request.' : 'Sign in to access your dashboard.'}
                  </p>
                </div>
                
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 animate-shake" role="alert">{error}</div>}
                {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4 animate-fadeIn" role="alert">{message}</div>}

                <form onSubmit={handleAuth} className="space-y-4 sm:space-y-6 relative z-20">
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
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:shadow-md focus:shadow-lg hover:border-primary-300 text-sm sm:text-base"
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
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:shadow-md focus:shadow-lg hover:border-primary-300"
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
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:shadow-md focus:shadow-lg hover:border-primary-300"
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
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:shadow-md focus:shadow-lg hover:border-primary-300 text-sm sm:text-base"
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
                      className="w-full flex justify-center items-center py-2.5 sm:py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/25 hover:scale-105 disabled:hover:scale-100 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="relative z-10">{isSignUp ? 'Signing Up...' : 'Signing In...'}</span>
                        </>
                      ) : (
                        <span className="relative z-10">{isSignUp ? 'Sign Up' : 'Sign In'}</span>
                      )}
                    </button>
                  </div>

                  {!isSignUp && onForgotPassword && (
                    <div className="text-center relative z-20">
                      <button
                        type="button"
                        onClick={onForgotPassword}
                        className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors relative z-20 cursor-pointer"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  )}
                </form>

                <div className="mt-6 text-center relative z-20">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                      className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors relative z-20 cursor-pointer"
                    >
                      {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                  </p>
                </div>
                
                {!isSignUp && (
                  <div className="mt-4 sm:mt-6 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-md transition-all duration-200 relative z-20">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Demo Accounts:
                    </p>
                    <div className="grid grid-cols-1 gap-1 text-xs text-blue-600 dark:text-blue-400">
                      {[
                        { role: "Admin", email: "admin@test.com", password: "admin123" },
                        { role: "Service (Mukesh)", email: "mukesh@test.com", password: "mukesh123" },
                        { role: "Service (Suresh)", email: "suresh@test.com", password: "suresh123" },
                        { role: "Partner", email: "partner@test.com", password: "partner123" },
                        { role: "EPR (Mohit)", email: "mohit@test.com", password: "mohit123" },
                        { role: "EPR (Rohit)", email: "rohit@test.com", password: "rohit123" }
                      ].map((account, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center hover:bg-blue-100 dark:hover:bg-blue-800/30 px-1.5 py-1 rounded transition-colors duration-150">
                          <span className="font-medium text-xs mb-1 sm:mb-0">{account.role}:</span>
                          <span className="text-left sm:text-right text-xs">
                            <span className="text-blue-600 dark:text-blue-400">{account.email}</span>
                            <span className="text-blue-500 dark:text-blue-400 ml-1">/{account.password}</span>
                          </span>
                        </div>
                      ))}
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