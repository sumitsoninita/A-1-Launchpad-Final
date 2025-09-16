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
      // Validate that we have a valid user ID
      if (!user.id) {
        throw new Error('Invalid user session. Please log in again.');
      }
      
      console.log('CustomerDashboard: Fetching requests for user:', user.email, 'with ID:', user.id);
      const data = await api.getServiceRequestsForCustomer(user.id);
      
      // Additional client-side validation
      const invalidRequests = data.filter(req => req.customer_id !== user.id);
      if (invalidRequests.length > 0) {
        console.error('SECURITY WARNING: CustomerDashboard received requests not belonging to user:', invalidRequests);
        // Filter out any requests that don't belong to this customer
        const validRequests = data.filter(req => req.customer_id === user.id);
        setRequests(validRequests);
      } else {
        setRequests(data);
      }
    } catch (err: any) {
      console.error('Error in CustomerDashboard fetchRequests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.id, user.email]);

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
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2">My Service Requests</h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Track and manage your fence service requests</p>
                </div>
                <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3'>
                  <button
                    onClick={() => setView('faq')}
                    className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    FAQ
                  </button>
                  <button
                    onClick={() => setView('form')}
                    className="inline-flex items-center justify-center px-4 sm:px-6 py-2 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Submit New Request
                  </button>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center items-center h-48 sm:h-64">
                <div className="text-center">
                  <Spinner />
                  <p className="mt-4 text-sm sm:text-base text-gray-500 dark:text-gray-400">Loading your service requests...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 sm:p-6 text-center">
                <div className="flex justify-center mb-4">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-red-800 dark:text-red-200 mb-2">Error Loading Requests</h3>
                <p className="text-sm sm:text-base text-red-600 dark:text-red-300">{error}</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 sm:py-16 px-4 sm:px-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-center mb-4 sm:mb-6">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">No service requests found</h3>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6">Get started by submitting your first fence service request.</p>
                <button
                  onClick={() => setView('form')}
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none transition-all duration-200"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Submit Your First Request
                </button>
              </div>
            ) : (
              <ServiceRequestList 
                requests={requests} 
                onSelectRequest={handleRequestSelect} 
                onComplaintClick={(request) => {
                  setSelectedRequest(request);
                  setView('complaint');
                }}
                showRepairHistory={true} 
              />
            )}
          </>
        );
    }
  };

  return <div className="space-y-4 sm:space-y-6">{renderContent()}</div>;
};

export default CustomerDashboard;