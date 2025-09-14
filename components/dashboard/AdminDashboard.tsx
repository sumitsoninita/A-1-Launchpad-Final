import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ServiceRequest, Role, Status, ProductType, AppUser, Feedback } from '../../types';
import { api } from '../../services/api';
import ServiceRequestList from './ServiceRequestList';
import ServiceRequestDetails from './ServiceRequestDetails';
import Spinner from '../shared/Spinner';
import AnalyticsCharts from './AnalyticsCharts';
import FeedbackList from './FeedbackList';

const PRODUCT_CATEGORIES: ProductType[] = Object.values(ProductType);
const WORKFLOW_STATUSES: Status[] = Object.values(Status);

interface AdminDashboardProps {
  user: AppUser;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [productFilter, setProductFilter] = useState<ProductType | 'all'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const requestData = await api.getServiceRequests();
      setRequests(requestData);
      const feedbackData = await api.getFeedback();
      setFeedback(feedbackData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const searchMatch = searchTerm === '' || 
        req.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id.toString().includes(searchTerm);
      
      const statusMatch = statusFilter === 'all' || req.status === statusFilter;
      const productMatch = productFilter === 'all' || req.product_type === productFilter;
      
      return searchMatch && statusMatch && productMatch;
    });
  }, [requests, searchTerm, statusFilter, productFilter]);

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
      
       <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('overview')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Overview & Analytics
          </button>
          <button onClick={() => setActiveTab('feedback')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'feedback' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Customer Feedback <span className="ml-1 inline-block py-0.5 px-2.5 leading-none text-center whitespace-nowrap align-baseline font-bold bg-primary-100 text-primary-800 rounded-full">{feedback.length}</span>
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="Total Requests" value={kpiData.total} />
            <KpiCard title="In Progress" value={kpiData.inProgress} />
            <KpiCard title="Completed This Month" value={kpiData.completed} />
            <KpiCard title="Avg. Satisfaction" value={kpiData.avgRating + ' / 5'} />
          </div>

          {/* Analytics Charts */}
          <AnalyticsCharts requests={requests} />
          
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

      {activeTab === 'feedback' && (
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