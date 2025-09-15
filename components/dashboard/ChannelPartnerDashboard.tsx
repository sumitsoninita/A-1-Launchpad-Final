import React, { useState, useEffect, useCallback } from 'react';
import { AppUser, ServiceRequest } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';
import ServiceRequestList from './ServiceRequestList';
import PaymentStats from './PaymentStats';

interface ChannelPartnerDashboardProps {
  user: AppUser;
}

const ChannelPartnerDashboard: React.FC<ChannelPartnerDashboardProps> = ({ user }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real system, there would be a way to link requests to a channel partner.
      // For this demo, we'll just show a subset of all requests.
      const allRequests = await api.getServiceRequests();
      setRequests(allRequests.slice(0, 5)); // Demo: show first 5 requests
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Channel Partner Dashboard</h1>
      <p className="text-gray-500 dark:text-gray-400">
        Welcome, {user.fullName || user.email}. View the status of recent service requests below.
      </p>

      {/* Payment Statistics */}
      <div className="mb-6">
        <PaymentStats user={user} />
      </div>

      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Recent Service Requests</h2>
        {loading ? (
          <div className="flex justify-center items-center h-64"><Spinner /></div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : requests.length === 0 ? (
          <p>No recent service requests to display.</p>
        ) : (
          <ServiceRequestList requests={requests} onSelectRequest={() => { /* View only for partners */ }} />
        )}
      </div>
    </div>
  );
};

export default ChannelPartnerDashboard;