import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppUser, ServiceRequest, Complaint, EnrichedComplaint, EPRStatus, BulkServiceRequest } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';
import ServiceRequestList from './ServiceRequestList';
import ComplaintsList from './ComplaintsList';
import EPRTimeline from './EPRTimeline';
import BulkServiceRequestDetails from './BulkServiceRequestDetails';

interface EPRDashboardProps {
  user: AppUser;
}

const EPRDashboard: React.FC<EPRDashboardProps> = ({ user }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [bulkRequests, setBulkRequests] = useState<BulkServiceRequest[]>([]);
  const [complaints, setComplaints] = useState<EnrichedComplaint[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedBulkRequest, setSelectedBulkRequest] = useState<BulkServiceRequest | null>(null);
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
      // Get only requests assigned to this EPR team member
      const assignedRequests = await api.getServiceRequestsForTeamMember(user.email, user.role);
      console.log(`EPR Dashboard (${user.email}): Total assigned requests:`, assignedRequests.length);
      console.log(`EPR Dashboard (${user.email}): Assigned requests:`, assignedRequests.map(r => ({ id: r.id.slice(-8), status: r.status, assigned_to: r.assigned_to })));
      
      // EPR team can only see requests with "Diagnosis" status and beyond
      const eprRequests = assignedRequests.filter(req => 
        req.status === 'Diagnosis' || 
        req.status === 'Awaiting Approval' || 
        req.status === 'Repair in Progress' || 
        req.status === 'Quality Check' || 
        req.status === 'Completed' ||
        req.status === 'Cancelled'
      );
      console.log(`EPR Dashboard (${user.email}): Filtered EPR requests:`, eprRequests.length);
      console.log(`EPR Dashboard (${user.email}): EPR requests:`, eprRequests.map(r => ({ id: r.id.slice(-8), status: r.status, assigned_to: r.assigned_to })));
      setRequests(eprRequests);
      
      // Fetch bulk requests assigned to this EPR team member
      try {
        const bulkRequestData = await api.getBulkServiceRequests(user.email, user.role);
        // Filter bulk requests for EPR team (under_review and beyond)
        const eprBulkRequests = bulkRequestData.filter(req => 
          req.status === 'under_review' || 
          req.status === 'approved' || 
          req.status === 'in_progress' || 
          req.status === 'completed' ||
          req.status === 'cancelled'
        );
        setBulkRequests(eprBulkRequests);
        console.log(`EPR Dashboard (${user.email}): Fetched ${eprBulkRequests.length} bulk requests`);
      } catch (bulkError) {
        console.error('Error fetching bulk requests for EPR:', bulkError);
        // Don't fail the entire fetch if bulk requests fail
      }
      
      // EPR team can see all complaints (like service team)
      const complaintsData = await api.getComplaints();
      setComplaints(complaintsData);
    } catch (err: any) {
      console.error(`EPR Dashboard (${user.email}): Error fetching data:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.email, user.role]);

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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Complaints Management</h2>
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Service Requests</h2>
            <button
              onClick={fetchData}
              className="px-3 sm:px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors text-sm sm:text-base"
            >
              Refresh Data
            </button>
          </div>

          {/* Filters and Search */}
          <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
            <input
                type="text"
                placeholder="Search by S/N, Customer, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-1/3 px-3 sm:px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
            />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)} 
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
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
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
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

    if (activeTab === 'bulk-requests') {
      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Bulk Service Requests</h2>
            <button
              onClick={fetchData}
              className="px-3 sm:px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors text-sm sm:text-base"
            >
              Refresh Data
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64"><Spinner /></div>
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : bulkRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No bulk requests assigned</h3>
              <p className="text-gray-500 dark:text-gray-400">You don't have any bulk service requests assigned to you yet.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Request ID
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Requester
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Equipment Count
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {bulkRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                          {request.id.substring(0, 8)}...
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                          {request.requester_name}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            request.status === 'under_review' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            request.status === 'in_progress' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            request.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {request.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            request.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            request.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                            request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {request.priority.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                          {request.total_equipment_count}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                          <button
                            onClick={() => setSelectedBulkRequest(request)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                        <p className="text-sm text-blue-600 dark:text-blue-400">Cost Estimation Ready</p>
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

  if (selectedBulkRequest) {
    return (
      <BulkServiceRequestDetails
        request={selectedBulkRequest}
        onBack={() => setSelectedBulkRequest(null)}
        user={user}
        onUpdate={() => {
          fetchData(); // Refresh the data
        }}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">EPR Team Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Welcome, {user.fullName || user.email}. Manage complaints and coordinate with service team.
          </p>
        </div>
      </div>


      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex flex-wrap space-x-2 sm:space-x-8">
          <button
            onClick={() => setActiveTab('complaints')}
            className={`py-2 sm:py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${
              activeTab === 'complaints'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Complaints
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 sm:py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${
              activeTab === 'requests'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Service Requests
          </button>
          <button
            onClick={() => setActiveTab('bulk-requests')}
            className={`py-2 sm:py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${
              activeTab === 'bulk-requests'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Bulk Requests <span className="ml-1 inline-block py-0.5 px-2.5 leading-none text-center whitespace-nowrap align-baseline font-bold bg-blue-100 text-blue-800 rounded-full">{bulkRequests.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('integration')}
            className={`py-2 sm:py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${
              activeTab === 'integration'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Service Team Integration
          </button>
          <button
            onClick={() => setActiveTab('quotation-history')}
            className={`py-2 sm:py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${
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
