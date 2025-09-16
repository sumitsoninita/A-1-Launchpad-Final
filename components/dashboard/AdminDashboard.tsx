import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ServiceRequest, Role, Status, ProductType, AppUser, Feedback, EnrichedComplaint, EPRStatus } from '../../types';
import { api } from '../../services/api';
import ServiceRequestList from './ServiceRequestList';
import ServiceRequestDetails from './ServiceRequestDetails';
import Spinner from '../shared/Spinner';
import AnalyticsCharts from './AnalyticsCharts';
import FeedbackList from './FeedbackList';
import ComplaintsList from './ComplaintsList';
import EPRTimeline from './EPRTimeline';
import PaymentStats from './PaymentStats';

const PRODUCT_CATEGORIES: ProductType[] = Object.values(ProductType);
const WORKFLOW_STATUSES: Status[] = Object.values(Status);

interface AdminDashboardProps {
  user: AppUser;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [complaints, setComplaints] = useState<EnrichedComplaint[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [productFilter, setProductFilter] = useState<ProductType | 'all'>('all');
  const [eprStatusFilter, setEprStatusFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const requestData = await api.getServiceRequests();
      setRequests(requestData);
      const feedbackData = await api.getFeedback();
      setFeedback(feedbackData);
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

  // Redirect Service users away from Analytics tab
  useEffect(() => {
    if (user.role === Role.Service && activeTab === 'analytics') {
      setActiveTab('overview');
    }
  }, [user.role, activeTab]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const searchMatch = searchTerm === '' || 
        req.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id.toString().includes(searchTerm);
      
      const statusMatch = statusFilter === 'all' || req.status === statusFilter;
      const productMatch = productFilter === 'all' || req.product_type === productFilter;
      const eprStatusMatch = eprStatusFilter === 'all' || req.current_epr_status === eprStatusFilter;
      
      return searchMatch && statusMatch && productMatch && eprStatusMatch;
    });
  }, [requests, searchTerm, statusFilter, productFilter, eprStatusFilter]);

  const kpiData = useMemo(() => {
    const avgRating = feedback.length > 0 
        ? (feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length).toFixed(1) 
        : 'N/A';
    return {
        total: requests.length,
        inProgress: requests.filter(r => [Status.Diagnosis, Status.AwaitingApproval, Status.RepairInProgress, Status.QualityCheck].includes(r.status)).length,
        completed: requests.filter(r => r.status === Status.Completed).length,
        avgRating: avgRating,
    }
  }, [requests, feedback]);

  const handleUpdateRequest = () => {
    fetchData();
    setSelectedRequest(null);
  };
  
  if (selectedRequest) {
    return <ServiceRequestDetails request={selectedRequest} onBack={() => setSelectedRequest(null)} user={user} onUpdate={handleUpdateRequest}/>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Management Dashboard</h1>
      <p className="text-gray-500 dark:text-gray-400">Welcome, {user.email}. Role: <span className="font-semibold capitalize">{user.role.replace('_', ' ')}</span></p>
      
       {(user.role === Role.Admin || user.role === Role.Service) && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {user.role === Role.Admin && (
              <button onClick={() => setActiveTab('analytics')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'analytics' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                Analytics
              </button>
            )}
            <button onClick={() => setActiveTab('overview')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Service Requests
            </button>
            <button onClick={() => setActiveTab('complaints')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'complaints' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Customer Complaints <span className="ml-1 inline-block py-0.5 px-2.5 leading-none text-center whitespace-nowrap align-baseline font-bold bg-red-100 text-red-800 rounded-full">{complaints.filter(c => !c.is_resolved).length}</span>
            </button>
            <button onClick={() => setActiveTab('payment-stats')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'payment-stats' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Payment Management & Stats
            </button>
            {user.role === Role.Service && (
              <button onClick={() => setActiveTab('epr-integration')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'epr-integration' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                EPR Integration
              </button>
            )}
            <button onClick={() => setActiveTab('quotation-history')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'quotation-history' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Quotation History
            </button>
            {user.role === Role.Admin && (
              <button onClick={() => setActiveTab('feedback')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'feedback' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                Customer Feedback <span className="ml-1 inline-block py-0.5 px-2.5 leading-none text-center whitespace-nowrap align-baseline font-bold bg-primary-100 text-primary-800 rounded-full">{feedback.length}</span>
              </button>
            )}
          </nav>
        </div>
      )}

      {activeTab === 'analytics' && user.role === Role.Admin && (
        <AnalyticsCharts requests={requests} feedback={feedback} />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="Total Requests" value={kpiData.total} />
            <KpiCard title="In Progress" value={kpiData.inProgress} />
            <KpiCard title="Completed This Month" value={kpiData.completed} />
            {user.role === Role.Admin && <KpiCard title="Avg. Satisfaction" value={kpiData.avgRating + ' / 5'} />}
          </div>
          
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white pt-4">Service Requests</h2>

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
                <select value={productFilter} onChange={e => setProductFilter(e.target.value as ProductType | 'all')} className="w-full sm:w-auto px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500">
                    <option value="all">All Products</option>
                    {PRODUCT_CATEGORIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as Status | 'all')} className="w-full sm:w-auto px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500">
                    <option value="all">All Statuses</option>
                    {WORKFLOW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
            <ServiceRequestList requests={filteredRequests} onSelectRequest={setSelectedRequest} />
          )}
        </div>
      )}

      {activeTab === 'complaints' && (user.role === Role.Admin || user.role === Role.Service) && (
        <div className="space-y-6">
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Customer Complaints</h2>
           {loading ? <div className="flex justify-center items-center h-64"><Spinner /></div> : <ComplaintsList complaints={complaints} onComplaintUpdate={fetchData} />}
        </div>
      )}

      {activeTab === 'payment-stats' && (user.role === Role.Admin || user.role === Role.Service) && (
        <PaymentStats user={user} />
      )}

      {activeTab === 'epr-integration' && user.role === Role.Service && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">EPR Team Integration</h2>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
            >
              Refresh Data
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EPR Actions for Service Team */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">EPR Cost Estimations Ready</h3>
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
                        onClick={() => setSelectedRequest(request)}
                        className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md"
                      >
                        Generate Quote
                      </button>
                    </div>
                  </div>
                ))}
                {requests.filter(req => req.current_epr_status === 'Cost Estimation Preparation').length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No cost estimations ready from EPR team</p>
                )}
              </div>
            </div>

            {/* Requests Ready for EPR Team */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Ready for EPR Team</h3>
              <div className="space-y-3">
                {requests.filter(req => req.status === 'Diagnosis' && !req.current_epr_status).map(request => (
                  <div key={request.id} className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">Request #{request.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{request.customer_name}</p>
                        <p className="text-sm text-orange-600 dark:text-orange-400">Ready for EPR Assessment</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Status: {request.status}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
                {requests.filter(req => req.status === 'Diagnosis' && !req.current_epr_status).length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No requests ready for EPR team</p>
                )}
              </div>
            </div>
          </div>

          {/* Customer Quote Decisions */}
          <div className="mt-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Customer Quote Decisions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Approved Quotes */}
                <div>
                  <h4 className="text-md font-medium text-green-600 dark:text-green-400 mb-3">✓ Approved Quotes</h4>
                  <div className="space-y-2">
                    {requests.filter(req => req.quote && req.quote.is_approved === true).map(request => (
                      <div key={request.id} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white text-sm">Request #{request.id.slice(-8)}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{request.customer_name}</p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Amount: {request.quote?.currency === 'USD' ? '$' : '₹'}{request.quote?.total_cost}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                    {requests.filter(req => req.quote && req.quote.is_approved === true).length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-2">No approved quotes</p>
                    )}
                  </div>
                </div>

                {/* Rejected Quotes */}
                <div>
                  <h4 className="text-md font-medium text-red-600 dark:text-red-400 mb-3">✗ Rejected Quotes</h4>
                  <div className="space-y-2">
                    {requests.filter(req => req.quote && req.quote.is_approved === false).map(request => (
                      <div key={request.id} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white text-sm">Request #{request.id.slice(-8)}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{request.customer_name}</p>
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Amount: {request.quote?.currency === 'USD' ? '$' : '₹'}{request.quote?.total_cost}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                    {requests.filter(req => req.quote && req.quote.is_approved === false).length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-2">No rejected quotes</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* EPR Timeline for Selected Request */}
          {selectedRequest && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">EPR Timeline for Request #{selectedRequest.id.slice(-8)}</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
              <EPRTimeline 
                request={selectedRequest} 
                user={user}
                onStatusUpdate={async () => {}} // Read-only for service team
                onBack={() => setSelectedRequest(null)}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'quotation-history' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quotation History</h2>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
            >
              Refresh Data
            </button>
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
      )}

      {activeTab === 'feedback' && user.role === Role.Admin && (
        <div className="space-y-6">
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Recent Customer Feedback</h2>
           {loading ? <div className="flex justify-center items-center h-64"><Spinner /></div> : <FeedbackList feedback={feedback} />}
        </div>
      )}
    </div>
  );
};

const KpiCard: React.FC<{title: string, value: number | string}> = ({title, value}) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-primary-500">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">{title}</h3>
        <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
);


export default AdminDashboard;