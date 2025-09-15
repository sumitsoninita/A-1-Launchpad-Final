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
import EPRDashboard from './components/dashboard/EPRDashboard';
import Header from './components/shared/Header';
import Spinner from './components/shared/Spinner';
import ChatWidget from './components/shared/ChatWidget';
import Footer from './components/shared/Footer';
import { ThemeProvider } from './contexts/ThemeContext';

type AuthView = 'login' | 'forgot-password' | 'reset-password';

const AppContent: React.FC = () => {
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
        // Check URL parameters for password reset indicators
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        
        // Check for various password reset URL patterns
        const isPasswordReset = 
          hash.includes('type=recovery') || 
          hash.includes('access_token') ||
          urlParams.get('type') === 'recovery' ||
          urlParams.get('access_token');
        
        if (isPasswordReset) {
          console.log('Password reset detected, checking session...');
          
          // Get the session to verify it's a valid reset session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session error during password reset:', error);
            // Still show reset password form, let the component handle the error
            setAuthView('reset-password');
          } else if (session) {
            console.log('Valid reset session found, showing reset password form');
            setAuthView('reset-password');
          } else {
            // No session yet, but URL indicates reset - wait a bit and try again
            console.log('No session yet, waiting for auth state...');
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                setAuthView('reset-password');
              }
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Error checking password reset session:', error);
      }
    };
    
    checkPasswordReset();
    
    // Listen for auth state changes to catch password reset sessions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session ? 'session exists' : 'no session');
      
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        const hash = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);
        const isPasswordReset = 
          hash.includes('type=recovery') || 
          hash.includes('access_token') ||
          urlParams.get('type') === 'recovery' ||
          urlParams.get('access_token');
        
        if (isPasswordReset) {
          console.log('Password reset session detected via auth state change');
          setAuthView('reset-password');
        }
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
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
      case Role.EPR:
        return <EPRDashboard user={user} />;
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

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;