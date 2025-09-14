import React, { useState, useEffect, useCallback } from 'react';
import { AppUser, Role } from './types';
import { api } from './services/api';
import { supabase } from './services/supabase';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import AdminDashboard from './components/dashboard/AdminDashboard';
import CustomerDashboard from './components/dashboard/CustomerDashboard';
import ChannelPartnerDashboard from './components/dashboard/ChannelPartnerDashboard';
import Header from './components/shared/Header';
import Spinner from './components/shared/Spinner';
import ChatWidget from './components/shared/ChatWidget';
import Footer from './components/shared/Footer';

type AuthView = 'login' | 'forgot-password' | 'reset-password';

const App: React.FC = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<AuthView>('login');

  const checkUser = useCallback(() => {
    setLoading(true);
    const currentUser = api.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkUser();
    
    // Check if this is a password reset flow
    const checkPasswordReset = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && window.location.hash.includes('type=recovery')) {
          setAuthView('reset-password');
        }
      } catch (error) {
        console.error('Error checking password reset session:', error);
      }
    };
    
    checkPasswordReset();
    // No subscription needed for mock auth, but in a real app with websockets you'd have one.
  }, [checkUser]);

  const handleLogin = (loggedInUser: AppUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setAuthView('login');
  };

  const handleForgotPassword = () => {
    setAuthView('forgot-password');
  };

  const handleBackToLogin = () => {
    setAuthView('login');
  };
  
  const renderContent = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }

    if (!user) {
      switch (authView) {
        case 'forgot-password':
          return <ForgotPassword onBackToLogin={handleBackToLogin} />;
        case 'reset-password':
          return <ResetPassword onBackToLogin={handleBackToLogin} />;
        case 'login':
        default:
          return <Login onLogin={handleLogin} onForgotPassword={handleForgotPassword} />;
      }
    }

    switch (user.role) {
      case Role.Admin:
      case Role.Service:
      case Role.CPR:
        return <AdminDashboard user={user} />;
      case Role.ChannelPartner:
        return <ChannelPartnerDashboard user={user} />;
      case Role.Customer:
        return <CustomerDashboard user={user} />;
      default:
        return <Login onLogin={handleLogin}/>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">
      <Header user={user} onLogout={handleLogout} />
      <main className="p-4 sm:p-6 md:p-8 flex-grow">
        {renderContent()}
      </main>
      {user && <ChatWidget user={user} />}
      <Footer />
    </div>
  );
};

export default App;