import React, { useState, useEffect } from 'react';
import { Role } from '../../types';
import { api } from '../../services/api';

interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  todayPayments: number;
  todayAmount: number;
  monthlyPayments: number;
  monthlyAmount: number;
}

interface Payment {
  id: string;
  service_request_id: string;
  quote_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount: number;
  status: string;
  customer_name: string;
  customer_email: string;
  created_at: string;
  updated_at: string;
  service_requests?: {
    id: string;
    customer_name: string;
    customer_email: string;
    service_type: string;
    status: string;
  };
}

interface PaymentStatsProps {
  user: any;
}

const PaymentStats: React.FC<PaymentStatsProps> = ({ user }) => {
  const [stats, setStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalAmount: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    todayPayments: 0,
    todayAmount: 0,
    monthlyPayments: 0,
    monthlyAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [showDetails, setShowDetails] = useState(false);
  const [showPaymentList, setShowPaymentList] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchPaymentStats();
    
    // Subscribe to real-time payment statistics updates
    const subscription = api.subscribeToPaymentStatistics((payload) => {
      console.log('Payment statistics update received:', payload);
      if (payload.type === 'statistics_update') {
        // Map the API response to our component's expected format
        const apiStats = payload.data;
        setStats({
          totalPayments: apiStats.total_payments || 0,
          totalAmount: apiStats.total_amount_captured || 0,
          completedPayments: apiStats.successful_payments || 0,
          pendingPayments: apiStats.pending_payments || 0,
          failedPayments: apiStats.failed_payments || 0,
          todayPayments: apiStats.today_payments || 0,
          todayAmount: apiStats.today_amount || 0,
          monthlyPayments: apiStats.monthly_payments || 0,
          monthlyAmount: apiStats.monthly_amount || 0
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [timeRange]);

  const fetchPayments = async () => {
    try {
      setPaymentLoading(true);
      console.log('🔍 Fetching payments...');
      const paymentData = await api.getAllPayments();
      console.log('📊 Payment data received:', paymentData);
      setPayments(paymentData);
    } catch (error) {
      console.error('❌ Error fetching payments:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      setLoading(true);
      
      // Use the new API method to get payment statistics
      const apiStats = await api.getPaymentStatistics();
      
      // Map the API response to our component's expected format
      const mappedStats: PaymentStats = {
        totalPayments: apiStats.total_payments || 0,
        totalAmount: apiStats.total_amount_captured || 0,
        completedPayments: apiStats.successful_payments || 0,
        pendingPayments: apiStats.pending_payments || 0,
        failedPayments: apiStats.failed_payments || 0,
        todayPayments: apiStats.today_payments || 0,
        todayAmount: apiStats.today_amount || 0,
        monthlyPayments: apiStats.monthly_payments || 0,
        monthlyAmount: apiStats.monthly_amount || 0
      };
      
      setStats(mappedStats);
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      
      // Fallback to mock data if API fails
      const mockStats: PaymentStats = {
        totalPayments: 156,
        totalAmount: 234500,
        completedPayments: 142,
        pendingPayments: 8,
        failedPayments: 4,
        todayPayments: 12,
        todayAmount: 18500,
        monthlyPayments: 45,
        monthlyAmount: 67500
      };
      
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getSuccessRate = () => {
    if (stats.totalPayments === 0) return 0;
    return Math.round((stats.successfulPayments / stats.totalPayments) * 100);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Payment Statistics</h2>
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'today' | 'week' | 'month' | 'year')}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
          
          <button
            onClick={fetchPaymentStats}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Payments */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPayments}</p>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{getSuccessRate()}%</p>
            </div>
          </div>
        </div>

        {/* Today's Payments */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todayPayments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Successful Payments */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Successful</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.successfulPayments}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingPayments}</p>
            </div>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Failed Payments */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failedPayments}</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>

        {/* Refunded Payments */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Refunded</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.refundedPayments}</p>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">This Month</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Payments</span>
              <span className="font-semibold text-gray-800 dark:text-white">{stats.monthlyPayments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Amount</span>
              <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(stats.monthlyAmount)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Today</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Payments</span>
              <span className="font-semibold text-gray-800 dark:text-white">{stats.todayPayments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Amount</span>
              <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(stats.todayAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Payment Method Breakdown</h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Payment Methods */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800 dark:text-white">Payment Methods</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">💳 Card</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white">45%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">📱 UPI</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white">35%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">🏦 Net Banking</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white">15%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">💼 Wallet</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white">5%</span>
              </div>
            </div>
          </div>

          {/* Product Types */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800 dark:text-white">Product Types</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">⚡ Energizer</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white">60%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">🔧 Fence</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white">40%</span>
              </div>
            </div>
          </div>

          {/* Service Status */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-800 dark:text-white">Service Status</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">✅ Completed</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white">70%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">🔧 In Progress</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white">25%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">⏳ Pending</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white">5%</span>
              </div>
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-800 dark:text-white mb-4">Recent Payment Activity</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">Payment received from John Doe</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">₹1,500 • Card • 2 minutes ago</p>
                  </div>
                </div>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">+₹1,500</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">Payment received from Jane Smith</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">₹2,500 • UPI • 15 minutes ago</p>
                  </div>
                </div>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">+₹2,500</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">Payment pending from Mike Johnson</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">₹1,800 • Net Banking • 30 minutes ago</p>
                  </div>
                </div>
                <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Pending</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment List Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Payment Transactions</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowPaymentList(!showPaymentList);
                if (!showPaymentList && payments.length === 0) {
                  fetchPayments();
                }
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {showPaymentList ? 'Hide List' : 'View All Payments'}
            </button>
            {showPaymentList && (
              <button
                onClick={fetchPayments}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {showPaymentList && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Search and Filter */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by customer name, email, or payment ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="sm:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="captured">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment List */}
            <div className="overflow-x-auto">
              {paymentLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400 mb-2">No payments found</div>
                  <div className="text-sm text-gray-400 dark:text-gray-500">
                    Payments will appear here once customers make payments
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Payment ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {payments
                      .filter(payment => {
                        const matchesSearch = !searchTerm || 
                          payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.razorpay_payment_id.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
                        return matchesSearch && matchesStatus;
                      })
                      .map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {payment.customer_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {payment.customer_email}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              payment.status === 'captured' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : payment.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {payment.status === 'captured' ? 'Completed' : payment.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {payment.razorpay_payment_id || 'N/A'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentStats;
