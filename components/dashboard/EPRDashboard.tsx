import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppUser, ServiceRequest, Complaint, EnrichedComplaint, EPRStatus } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';
import ServiceRequestList from './ServiceRequestList';
import ComplaintsList from './ComplaintsList';
import EPRTimeline from './EPRTimeline';

interface EPRDashboardProps {
  user: AppUser;
}

const EPRDashboard: React.FC<EPRDashboardProps> = ({ user }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [complaints, setComplaints] = useState<EnrichedComplaint[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('complaints');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eprStatusFilter, setEprStatusFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // EPR team can only see requests with "Diagnosis" status and beyond
      const allRequests = await api.getServiceRequests();
      const eprRequests = allRequests.filter(req => 
        req.status === 'Diagnosis' || 
        req.status === 'Awaiting Approval' || 
        req.status === 'Repair in Progress' || 
        req.status === 'Quality Check' || 
        req.status === 'Completed' ||
        req.status === 'Cancelled'
      );
      setRequests(eprRequests);
      
      // EPR team can see all complaints (like service team)
      const complaintsData = await api.getComplaints();
      setComplaints(complaintsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const searchMatch = searchTerm === '' || 
        req.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id.toString().includes(searchTerm);
      
      const statusMatch = statusFilter === 'all' || req.status === statusFilter;
      const eprStatusMatch = eprStatusFilter === 'all' || req.current_epr_status === eprStatusFilter;
      
      return searchMatch && statusMatch && eprStatusMatch;
    });
  }, [requests, searchTerm, statusFilter, eprStatusFilter]);

  const handleRequestSelect = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setActiveTab('timeline');
  };

  const handleEPRStatusUpdate = async (requestId: string, eprStatus: EPRStatus, details?: string, costEstimation?: number, costEstimationCurrency?: 'INR' | 'USD', approvalDecision?: 'approved' | 'declined') => {
    try {
      await api.updateEPRStatus(requestId, eprStatus, user.email, details, costEstimation, costEstimationCurrency, approvalDecision);
      await fetchData(); // Refresh data
      if (selectedRequest && selectedRequest.id === requestId) {
        // Update the selected request
        const updatedRequest = await api.getServiceRequestById(requestId);
        if (updatedRequest) {
          setSelectedRequest(updatedRequest);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderContent = () => {
    if (activeTab === 'timeline' && selectedRequest) {
      return (
        <EPRTimeline 
          request={selectedRequest} 
          user={user}
          onStatusUpdate={handleEPRStatusUpdate}
          onBack={() => setActiveTab('complaints')}
        />
      );
    }

    if (activeTab === 'complaints') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Complaints Management</h2>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64"><Spinner /></div>
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : (
            <ComplaintsList complaints={complaints} />
          )}
        </div>
      );
    }

    if (activeTab === 'requests') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Service Requests</h2>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
            >
              Refresh Data
            </button>
          </div>

          {/* Filters and Search */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
            <input
                type="text"
                placeholder="Search by S/N, Customer, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-1/3 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="flex items-center space-x-4">
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)} 
                  className="w-full sm:w-auto px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                    <option value="all">All Statuses</option>
                    <option value="Received">Received</option>
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="Awaiting Approval">Awaiting Approval</option>
                    <option value="Repair in Progress">Repair in Progress</option>
                    <option value="Quality Check">Quality Check</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
                <select 
                  value={eprStatusFilter} 
                  onChange={e => setEprStatusFilter(e.target.value)} 
                  className="w-full sm:w-auto px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                    <option value="all">All EPR Statuses</option>
                    <option value="Cost Estimation Preparation">Cost Estimation Preparation</option>
                    <option value="Awaiting Approval">Awaiting Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Declined">Declined</option>
                    <option value="Repair in Progress">Repair in Progress</option>
                    <option value="Repair Completed">Repair Completed</option>
                    <option value="Return to Customer">Return to Customer</option>
                </select>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64"><Spinner /></div>
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : (
            <ServiceRequestList requests={filteredRequests} onSelectRequest={handleRequestSelect} />
          )}
        </div>
      );
    }

    if (activeTab === 'integration') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Service Team Integration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Quote Decisions */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Customer Quote Decisions</h3>
              <div className="space-y-3">
                {requests.filter(req => req.quote && req.quote.is_approved === true).map(request => (
                  <div key={request.id} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">Request #{request.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{request.customer_name}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">✓ Quote Approved - Start Repair</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Quote Amount: {request.quote?.currency === 'USD' ? '$' : '₹'}{request.quote?.total_cost}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRequestSelect(request)}
                        className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md"
                      >
                        Start Repair
                      </button>
                    </div>
                  </div>
                ))}
                {requests.filter(req => req.quote && req.quote.is_approved === false).map(request => (
                  <div key={request.id} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">Request #{request.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{request.customer_name}</p>
                        <p className="text-sm text-red-600 dark:text-red-400">✗ Quote Rejected - Return to Customer</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Quote Amount: {request.quote?.currency === 'USD' ? '$' : '₹'}{request.quote?.total_cost}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRequestSelect(request)}
                        className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                ))}
                {requests.filter(req => req.quote && (req.quote.is_approved === true || req.quote.is_approved === false)).length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No customer quote decisions yet</p>
                )}
              </div>
            </div>

            {/* EPR Cost Estimations */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">EPR Cost Estimations</h3>
              <div className="space-y-3">
                {requests.filter(req => req.current_epr_status === 'Cost Estimation Preparation').map(request => (
                  <div key={request.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">Request #{request.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{request.customer_name}</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">💰 Cost Estimation Ready</p>
                        {request.epr_timeline && request.epr_timeline.length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Cost Estimation: {request.epr_timeline[request.epr_timeline.length - 1]?.cost_estimation_currency === 'USD' ? '$' : '₹'}{request.epr_timeline[request.epr_timeline.length - 1]?.cost_estimation}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRequestSelect(request)}
                        className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
                {requests.filter(req => req.current_epr_status === 'Cost Estimation Preparation').length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No cost estimations ready</p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'quotation-history') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quotation History</h2>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Request ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quote Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {requests.filter(req => req.quote).map(request => (
                    <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                        ...{request.id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {request.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {request.quote?.currency === 'USD' ? '$' : '₹'}{request.quote?.total_cost}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.quote?.is_approved === true 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : request.quote?.is_approved === false
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {request.quote?.is_approved === true ? 'Approved' : 
                           request.quote?.is_approved === false ? 'Rejected' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(request.quote?.created_at || '').toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {requests.filter(req => req.quote).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No quotations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">EPR Team Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome, {user.fullName || user.email}. Manage complaints and coordinate with service team.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('complaints')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'complaints'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Complaints
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Service Requests
          </button>
          <button
            onClick={() => setActiveTab('integration')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'integration'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Service Team Integration
          </button>
          <button
            onClick={() => setActiveTab('quotation-history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'quotation-history'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Quotation History
          </button>
          {selectedRequest && (
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timeline'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              EPR Timeline
            </button>
          )}
        </nav>
      </div>

      {renderContent()}
    </div>
  );
};

export default EPRDashboard;
