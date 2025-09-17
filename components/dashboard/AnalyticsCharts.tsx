import React, { useMemo, useState } from 'react';
import { ServiceRequest, Status, ProductType, Feedback } from '../../types';
import { api } from '../../services/api';

interface AnalyticsChartsProps {
  requests: ServiceRequest[];
  feedback?: Feedback[];
}

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ requests, feedback = [] }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // CSV Download functionality
  const downloadCSV = async () => {
    try {
      setIsDownloading(true);
      console.log('Starting CSV download...');
      
      const csvData = await api.getCSVExportData();
      console.log('CSV data received:', csvData.length, 'records');
      
      if (csvData.length === 0) {
        alert('No data available for export');
        return;
      }

      // Convert to CSV format
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `service_requests_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('CSV download completed successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Comprehensive analytics calculations
  const analytics = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Status distribution
    const statusCounts = requests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<Status, number>);

    // Product type distribution
    const productCounts = requests.reduce((acc, req) => {
      acc[req.product_type] = (acc[req.product_type] || 0) + 1;
      return acc;
    }, {} as Record<ProductType, number>);

    // Daily trends (last 30 days)
    const dailyData = requests.reduce((acc, req) => {
      const date = new Date(req.created_at);
      const dayKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      acc[dayKey] = (acc[dayKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort daily data by date
    const sortedDailyData = Object.entries(dailyData)
      .sort(([a], [b]) => {
        const [monthA, dayA] = a.split('/').map(Number);
        const [monthB, dayB] = b.split('/').map(Number);
        return monthA - monthB || dayA - dayB;
      })
      .slice(-14) // Show last 14 days
      .map(([label, value]) => ({ label, value }));

    // Completion rate
    const completedCount = statusCounts['Completed'] || 0;
    const totalCount = requests.length;
    const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // Average processing time (in hours)
    const completedRequests = requests.filter(req => req.status === 'Completed');
    const avgProcessingTimeHours = completedRequests.length > 0 
      ? completedRequests.reduce((sum, req) => {
          const created = new Date(req.created_at);
          const updated = new Date(req.updated_at);
          return sum + (updated.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
        }, 0) / completedRequests.length
      : 0;

    // Warranty vs non-warranty
    const warrantyCount = requests.filter(req => req.is_warranty_claim).length;
    const nonWarrantyCount = totalCount - warrantyCount;

    // Average satisfaction rating from feedback
    const avgRating = feedback.length > 0 
      ? feedback.reduce((sum, fb) => sum + fb.rating, 0) / feedback.length 
      : 0;

    // EPR integration stats
    const eprRequests = requests.filter(req => req.current_epr_status);
    
    // Debug EPR data
    console.log('EPR Debug Info:', {
      totalRequests: requests.length,
      eprRequests: eprRequests.length,
      eprStatuses: eprRequests.map(req => ({
        id: req.id,
        status: req.current_epr_status
      }))
    });
    
    const eprInProgress = eprRequests.filter(req => 
      req.current_epr_status === 'Cost Estimation Preparation' || 
      req.current_epr_status === 'Awaiting Approval' ||
      req.current_epr_status === 'Approved' ||
      req.current_epr_status === 'Repair in Progress'
    );
    const eprCompleted = eprRequests.filter(req => 
      req.current_epr_status === 'Repair Completed' || 
      req.current_epr_status === 'Return to Customer'
    );
    const eprCompletionRate = eprRequests.length > 0 
      ? (eprCompleted.length / eprRequests.length) * 100 
      : 0;

    // Quote statistics
    const quotedRequests = requests.filter(req => req.quote);
    const approvedQuotes = quotedRequests.filter(req => req.quote?.is_approved === true);
    const rejectedQuotes = quotedRequests.filter(req => req.quote?.is_approved === false);
    const pendingQuotes = quotedRequests.filter(req => req.quote?.is_approved === null);

    return {
      statusData: Object.entries(statusCounts).map(([label, value]) => ({ 
        label, 
        value, 
        color: getStatusColor(label as Status) 
      })),
      productData: Object.entries(productCounts).map(([label, value]) => ({ 
        label, 
        value, 
        color: getProductColor(label as ProductType) 
      })),
      dailyData: sortedDailyData,
      completionRate,
      avgProcessingTimeHours,
      avgRating,
      warrantyData: [
        { label: 'Warranty Claims', value: warrantyCount, color: '#10B981' },
        { label: 'Non-Warranty', value: nonWarrantyCount, color: '#F59E0B' }
      ],
      eprStats: {
        total: eprRequests.length,
        inProgress: eprInProgress.length,
        completed: eprCompleted.length,
        rate: eprCompletionRate
      },
      quoteStats: {
        total: quotedRequests.length,
        approved: approvedQuotes.length,
        rejected: rejectedQuotes.length,
        pending: pendingQuotes.length,
        approvalRate: quotedRequests.length > 0 ? (approvedQuotes.length / quotedRequests.length) * 100 : 0
      }
    };
  }, [requests, feedback]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50 to-amber-50 dark:from-gray-900 dark:via-red-900/20 dark:to-amber-900/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-800 via-red-700 to-amber-800 rounded-2xl shadow-2xl mb-6 sm:mb-8">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">Analytics Dashboard</h1>
              <p className="text-red-100 text-sm sm:text-base md:text-lg">Comprehensive insights into your service operations</p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start mt-4 space-y-2 sm:space-y-0 sm:space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-xs sm:text-sm">Live Data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span className="text-white text-xs sm:text-sm">Real-time Updates</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4 lg:gap-0">
              <div className="text-center lg:text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white">{requests.length}</div>
                <div className="text-red-100 text-sm sm:text-base">Total Requests</div>
              </div>
              <button
                onClick={downloadCSV}
                disabled={isDownloading}
                className="w-full sm:w-auto px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 border border-white/30 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download Sheet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <MetricCard 
          title="Completion Rate" 
          value={`${analytics.completionRate.toFixed(1)}%`}
          icon="✓"
          color="red"
          trend="up"
        />
        <MetricCard 
          title="Avg. Processing Time" 
          value={analytics.avgProcessingTimeHours < 24 ? 
            `${analytics.avgProcessingTimeHours.toFixed(1)} hrs` : 
            `${(analytics.avgProcessingTimeHours / 24).toFixed(1)} days`}
          icon="⏰"
          color="amber"
          trend="down"
        />
        <MetricCard 
          title="Customer Rating" 
          value={analytics.avgRating > 0 ? `${analytics.avgRating.toFixed(1)}/5` : 'N/A'}
          subtitle="Average satisfaction"
          icon="★"
          color="burgundy"
          trend="up"
        />
        <MetricCard 
          title="Quote Approval Rate" 
          value={`${analytics.quoteStats.approvalRate.toFixed(1)}%`}
          icon="$"
          color="gold"
          trend="up"
        />
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        <div className="space-y-8">
          <ChartCard 
            title="Service Requests by Status" 
            subtitle={`Total: ${requests.length} requests`}
            icon="📈"
            gradient="from-red-600 to-red-800"
          >
            <PieChart data={analytics.statusData} />
          </ChartCard>
          
          <ChartCard 
            title="Requests by Product Type" 
            subtitle="Distribution across product categories"
            icon="📋"
            gradient="from-amber-600 to-amber-800"
          >
            <BarChart data={analytics.productData} />
          </ChartCard>
        </div>

        <div className="space-y-8">
          <ChartCard 
            title="Warranty vs Non-Warranty Claims" 
            subtitle="Service request classification"
            icon="🛡"
            gradient="from-red-700 to-red-900"
          >
            <PieChart data={analytics.warrantyData} />
          </ChartCard>
          
          <ChartCard 
            title="Daily Request Trends" 
            subtitle="Request volume over last 14 days"
            icon="📈"
            gradient="from-amber-700 to-amber-900"
          >
            <LineChart data={analytics.dailyData} />
          </ChartCard>
        </div>
      </div>

      {/* EPR and Quote Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <ChartCard 
          title="EPR Integration Status" 
          subtitle="External Product Repair workflow"
          icon="⚙"
          gradient="from-red-800 to-red-900"
        >
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 sm:p-4 rounded-xl">
                <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.eprStats.total}</div>
                <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">Total EPR Requests</div>
              </div>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-3 sm:p-4 rounded-xl">
                <div className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{analytics.eprStats.inProgress}</div>
                <div className="text-xs sm:text-sm text-amber-600 dark:text-amber-400">In Progress</div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 sm:p-4 rounded-xl">
                <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{analytics.eprStats.completed}</div>
                <div className="text-xs sm:text-sm text-green-600 dark:text-green-400">Completed</div>
              </div>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">EPR Completion Rate</span>
                <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white">{analytics.eprStats.rate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 sm:h-3 rounded-full transition-all duration-1000 ease-out shadow-sm" 
                  style={{ width: `${analytics.eprStats.rate}%` }}
                ></div>
              </div>
            </div>
          </div>
      </ChartCard>

        <ChartCard 
          title="Quote Statistics" 
          subtitle="Customer quote decisions"
          icon="📋"
          gradient="from-amber-600 to-amber-800"
        >
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{analytics.quoteStats.approved}</div>
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">Approved</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{analytics.quoteStats.rejected}</div>
                <div className="text-xs text-red-600 dark:text-red-400 font-medium">Rejected</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <div className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{analytics.quoteStats.pending}</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Pending</div>
              </div>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Quote Approval Rate</span>
                <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white">{analytics.quoteStats.approvalRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 sm:h-3 rounded-full transition-all duration-1000 ease-out shadow-sm" 
                  style={{ width: `${analytics.quoteStats.approvalRate}%` }}
                ></div>
              </div>
            </div>
          </div>
      </ChartCard>
      </div>
    </div>
  );
};

// Helper functions for colors
const getStatusColor = (status: Status): string => {
  const colors: Record<Status, string> = {
    'Received': '#6B7280',
    'Diagnosis': '#F59E0B',
    'Awaiting Approval': '#8B5CF6',
    'Repair in Progress': '#3B82F6',
    'Quality Check': '#10B981',
    'Dispatched': '#EF4444',
    'Completed': '#059669',
    'Cancelled': '#6B7280'
  };
  return colors[status] || '#6B7280';
};

const getProductColor = (product: ProductType): string => {
  const colors: Record<ProductType, string> = {
    'Energizer Product': '#3B82F6',
    'Power Adapter': '#10B981',
    'Gate Motor Controller': '#F59E0B'
  };
  return colors[product] || '#6B7280';
};

// Enhanced Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: 'green' | 'blue' | 'purple' | 'yellow' | 'red' | 'amber' | 'burgundy' | 'gold';
  trend?: 'up' | 'down' | 'neutral';
}> = ({ title, value, subtitle, icon, color, trend }) => {
  const colorClasses = {
    green: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
    blue: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    purple: 'bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400',
    yellow: 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400',
    red: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
    amber: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
    burgundy: 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-800/20 dark:to-red-700/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300',
    gold: 'bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-800/20 dark:to-amber-800/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300'
  };

  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→'
  };

  return (
    <div className="group bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between h-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2 sm:mb-3">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{title}</p>
            {trend && (
              <span className="text-xs flex-shrink-0">{trendIcons[trend]}</span>
            )}
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 leading-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-xl border-2 ${colorClasses[color]} group-hover:scale-110 transition-transform duration-300 flex-shrink-0 ml-3 sm:ml-4`}>
          <span className="text-lg sm:text-2xl block">{icon}</span>
        </div>
      </div>
    </div>
  );
};

const ChartCard: React.FC<{ 
  title: string; 
  subtitle?: string; 
  icon?: string;
  gradient?: string;
  children: React.ReactNode 
}> = ({ title, subtitle, icon, gradient, children }) => (
  <div className="group bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
        {icon && (
          <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-r ${gradient || 'from-blue-500 to-purple-600'} text-white shadow-md`}>
            <span className="text-sm sm:text-lg">{icon}</span>
          </div>
        )}
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
      </div>
      {subtitle && (
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 ml-8 sm:ml-11">{subtitle}</p>
      )}
    </div>
    <div className="relative">
      {children}
    </div>
  </div>
);

// Enhanced Pie Chart Component
const PieChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  if (data.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available.</p>;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;
  const radius = 90;
  const centerX = 110;
  const centerY = 110;

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8">
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 220 220" className="transform -rotate-90 sm:w-[220px] sm:h-[220px]">
          {/* Background circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="#F3F4F6"
            className="dark:fill-gray-700"
          />
          
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const startAngle = (cumulativePercentage / 100) * 360;
            const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
            
            const startAngleRad = (startAngle * Math.PI) / 180;
            const endAngleRad = (endAngle * Math.PI) / 180;
            
            const x1 = centerX + radius * Math.cos(startAngleRad);
            const y1 = centerY + radius * Math.sin(startAngleRad);
            const x2 = centerX + radius * Math.cos(endAngleRad);
            const y2 = centerY + radius * Math.sin(endAngleRad);
            
            const largeArcFlag = percentage > 50 ? 1 : 0;
            
            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            cumulativePercentage += percentage;
            
            return (
              <path
                key={item.label}
                d={pathData}
                fill={item.color || `hsl(${index * 60}, 70%, 50%)`}
                className="transition-all duration-300 hover:opacity-80 drop-shadow-sm"
                stroke="#ffffff"
                strokeWidth="2"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-white dark:bg-gray-800 rounded-full p-3 sm:p-4 shadow-lg">
            <div className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">{total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-auto lg:ml-8 space-y-2 sm:space-y-3">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div 
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-sm border-2 border-white dark:border-gray-800 flex-shrink-0" 
              style={{ backgroundColor: item.color || `hsl(${index * 60}, 70%, 50%)` }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white truncate">{item.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.value} ({((item.value / total) * 100).toFixed(1)}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Simple and Clean Bar Chart Component
const BarChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400 text-center">No data available.</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-3 sm:space-y-4">
      {data.map((d, i) => {
        const percentage = (d.value / maxValue) * 100;
        return (
          <div key={d.label} className="space-y-1 sm:space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{d.label}</span>
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white ml-2">{d.value}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3 overflow-hidden">
              <div
                className="h-2 sm:h-3 rounded-full transition-all duration-1000 ease-out shadow-sm"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: d.color || `hsl(${i * 60}, 70%, 50%)`
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Line Chart Component
const LineChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  if (data.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available.</p>;
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartHeight = 160;
  const chartWidth = 280;
  const padding = 30;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - (d.value / maxValue) * (chartHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex items-center justify-center overflow-x-auto">
      <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="sm:w-[300px] sm:h-[200px]">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + ratio * (chartHeight - 2 * padding)}
            x2={chartWidth - padding}
            y2={padding + ratio * (chartHeight - 2 * padding)}
            stroke="#E5E7EB"
            strokeWidth="1"
            className="dark:stroke-gray-700"
          />
        ))}
        
        {/* Line */}
        <polyline
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
          points={points}
          className="transition-all duration-300 sm:stroke-[3]"
        />
        
        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (chartWidth - 2 * padding);
          const y = chartHeight - padding - (d.value / maxValue) * (chartHeight - 2 * padding);
          
            return (
            <g key={d.label}>
              <circle
                cx={x}
                cy={y}
                r="3"
                fill="#3B82F6"
                className="transition-all duration-300 hover:r-5 sm:r-[4px] sm:hover:r-6"
                />
                <text
                x={x}
                y={y - 8}
                textAnchor="middle"
                className="text-xs font-medium fill-current text-gray-800 dark:text-white"
                >
                {d.value}
                </text>
                <text
                x={x}
                y={chartHeight - 8}
                textAnchor="middle"
                className="text-xs fill-current text-gray-500 dark:text-gray-400"
                >
                {d.label}
                </text>
            </g>
            );
        })}
    </svg>
    </div>
  );
};

export default AnalyticsCharts;
