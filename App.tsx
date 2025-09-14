import React, { useState, useEffect, useCallback } from 'react';
import { AppUser, Role } from './types';
import { api } from './services/api';
import Login from './components/auth/Login';
import AdminDashboard from './components/dashboard/AdminDashboard';
import CustomerDashboard from './components/dashboard/CustomerDashboard';
import ChannelPartnerDashboard from './components/dashboard/ChannelPartnerDashboard';
import Header from './components/shared/Header';
import Spinner from './components/shared/Spinner';
import ChatWidget from './components/shared/ChatWidget';
import Footer from './components/shared/Footer';

const App: React.FC = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = useCallback(() => {
    setLoading(true);
    const currentUser = api.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkUser();
    // No subscription needed for mock auth, but in a real app with websockets you'd have one.
  }, [checkUser]);

  const handleLogin = (loggedInUser: AppUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };
  
  const renderContent = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }

    if (!user) {
      return <Login onLogin={handleLogin} />;
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