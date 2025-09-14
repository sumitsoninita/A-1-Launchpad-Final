import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { ServiceRequest, Role, AppUser } from '../../types';
import ServiceRequestList from './ServiceRequestList';
import ServiceRequestDetails from './ServiceRequestDetails';
import ServiceRequestForm from '../forms/ServiceRequestForm';
import ComplaintForm from '../forms/ComplaintForm';
import Spinner from '../shared/Spinner';
import FAQ from '../shared/FAQ';

interface CustomerDashboardProps {
  user: AppUser;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user }) => {
  const [view, setView] = useState<'list' | 'form' | 'details' | 'faq' | 'complaint'>('list');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getServiceRequestsForCustomer(user.id);
      setRequests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    if(view === 'list') {
      fetchRequests();
    }
  }, [view, fetchRequests]);


  const handleRequestSelect = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setView('details');
  };

  const handleFormSuccess = () => {
    setView('list');
    fetchRequests();
  };

  const renderContent = () => {
    switch (view) {
      case 'form':
        return <ServiceRequestForm user={user} onFormSubmitSuccess={handleFormSuccess} onCancel={() => setView('list')} />;
      case 'details':
        return selectedRequest && <ServiceRequestDetails request={selectedRequest} onBack={() => setView('list')} user={user} onUpdate={fetchRequests} />;
      case 'faq':
        return <FAQ onBack={() => setView('list')} />;
      case 'complaint':
        return <ComplaintForm user={user} requests={requests} onCancel={() => setView('list')} onSubmitSuccess={() => setView('list')} />;
      case 'list':
      default:
        return (
          <>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Service Requests</h1>
              <div className='flex items-center flex-wrap gap-2'>
                <button
                  onClick={() => setView('complaint')}
                  className="inline-flex items-center px-4 py-2 border border-yellow-500 rounded-md shadow-sm text-sm font-medium text-yellow-600 bg-white dark:bg-gray-700 hover:bg-yellow-50 dark:hover:bg-gray-600 focus:outline-none"
                >
                  Submit Complaint
                </button>
                 <button
                  onClick={() => setView('faq')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
                >
                  FAQ
                </button>
                <button
                  onClick={() => setView('form')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none"
                >
                  Submit New Request
                </button>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center items-center h-64"><Spinner /></div>
            ) : error ? (
              <div className="text-red-500 text-center">{error}</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No service requests found.</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by submitting a new repair request.</p>
              </div>
            ) : (
              <ServiceRequestList requests={requests} onSelectRequest={handleRequestSelect} />
            )}
          </>
        );
    }
  };

  return <div className="space-y-6">{renderContent()}</div>;
};

export default CustomerDashboard;