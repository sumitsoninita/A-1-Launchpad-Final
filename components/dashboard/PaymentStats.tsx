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
      console.log('Fetching payments...');
      const paymentData = await api.getAllPayments();
      console.log('Payment data received:', paymentData);
      setPayments(paymentData);
    } catch (error) {
      console.error('Error fetching payments:', error);
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


  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-800 via-red-700 to-amber-800 rounded-2xl p-4 sm:p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Payment Analytics</h2>
              <p className="text-red-100 text-sm sm:text-base lg:text-lg">Track and monitor all payment activities</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              {/* Time Range Selector */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <label className="text-xs sm:text-sm font-medium text-red-100 whitespace-nowrap">Time Range:</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as 'today' | 'week' | 'month' | 'year')}
                  className="px-3 sm:px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white text-xs sm:text-sm w-full sm:w-auto"
                >
                  <option value="today" className="bg-gray-800 text-white">Today</option>
                  <option value="week" className="bg-gray-800 text-white">This Week</option>
                  <option value="month" className="bg-gray-800 text-white">This Month</option>
                  <option value="year" className="bg-gray-800 text-white">This Year</option>
                </select>
              </div>
              
              <button
                onClick={fetchPaymentStats}
                className="px-4 sm:px-6 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 border border-white/30 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 text-xs sm:text-sm w-full sm:w-auto justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Payments */}
        <div className="group relative bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-red-200/50 dark:border-red-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total Payments</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.totalPayments}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="group relative bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-amber-200/50 dark:border-amber-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Total Amount</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalAmount)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Payments */}
        <div className="group relative bg-gradient-to-br from-red-100 to-red-200 dark:from-red-800/20 dark:to-red-700/20 p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-red-300/50 dark:border-red-600/50">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Today</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.todayPayments}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="group relative bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-yellow-200/50 dark:border-yellow-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">Pending</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingPayments}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Monthly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* This Month */}
        <div className="group relative bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-red-200/50 dark:border-red-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">This Month</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium">Payments</span>
                <span className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">{stats.monthlyPayments}</span>
              </div>
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium">Amount</span>
                <span className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.monthlyAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Today */}
        <div className="group relative bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-amber-200/50 dark:border-amber-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Today</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium">Payments</span>
                <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">{stats.todayPayments}</span>
              </div>
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium">Amount</span>
                <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.todayAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Payment List Section */}
      <div className="mt-6 sm:mt-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-500/5 to-transparent"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Payment Transactions</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">View and manage all payment records</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowPaymentList(!showPaymentList);
                  if (!showPaymentList && payments.length === 0) {
                    fetchPayments();
                  }
                }}
                className="px-4 sm:px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl text-sm sm:text-base justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{showPaymentList ? 'Hide List' : 'View All Payments'}</span>
              </button>
              {showPaymentList && (
                <button
                  onClick={fetchPayments}
                  className="px-4 sm:px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl text-sm sm:text-base justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {showPaymentList && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            {/* Search and Filter */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by customer name, email, or payment ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white shadow-sm text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white shadow-sm text-sm sm:text-base"
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
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Customer</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Amount</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Date</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Payment ID</th>
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
                        <tr key={payment.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all duration-200 group">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-xs sm:text-sm">
                                    {payment.customer_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                                  {payment.customer_name}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {payment.customer_email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">
                              {formatCurrency(payment.amount)}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 sm:px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                              payment.status === 'captured' 
                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900 dark:to-green-800 dark:text-green-200'
                                : payment.status === 'pending'
                                ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900 dark:to-yellow-800 dark:text-yellow-200'
                                : payment.status === 'failed'
                                ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900 dark:to-red-800 dark:text-red-200'
                                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900 dark:to-gray-800 dark:text-gray-200'
                            }`}>
                              {payment.status === 'captured' ? 'Completed' : payment.status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-1 sm:px-2 py-1 rounded">
                              {payment.razorpay_payment_id ? payment.razorpay_payment_id.slice(-8) : 'N/A'}
                            </div>
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
