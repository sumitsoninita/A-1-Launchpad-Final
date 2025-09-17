import React, { useState, useEffect } from 'react';
import { BulkServiceRequest, Role, AppUser, EPRStatus, EPRTimelineEntry, Quote } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';
import BulkQuoteForm from '../forms/BulkQuoteForm';
import PaymentModal from '../payment/PaymentModal';
import BulkEPRTimeline from './BulkEPRTimeline';

const BULK_WORKFLOW_STATUSES = ['pending', 'under_review', 'approved', 'in_progress', 'completed', 'cancelled'];

interface BulkServiceRequestDetailsProps {
  request: BulkServiceRequest;
  onBack: () => void;
  user: AppUser;
  onUpdate: () => void;
}

const BulkServiceRequestDetails: React.FC<BulkServiceRequestDetailsProps> = ({ 
  request: initialRequest, 
  onBack, 
  user, 
  onUpdate 
}) => {
  const [request, setRequest] = useState(initialRequest);
  const [newStatus, setNewStatus] = useState<string>(request.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Timeline state
  const [timelineFilter, setTimelineFilter] = useState('all');
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Inline payment state
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentId, setPaymentId] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');

  const isAdmin = user.role !== Role.Customer;
  const currentStepInfo = BULK_WORKFLOW_STATUSES.indexOf(request.status);
  
  const handleStatusUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
        const updatedRequest = await api.updateBulkServiceRequestStatus(request.id, newStatus as any, user.email);
        setRequest(updatedRequest);
        onUpdate();

        alert('Bulk request status updated successfully!');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleQuoteAction = async (isApproved: boolean) => {
    // For bulk requests, we'll handle quote approval at the equipment item level
    alert('Quote approval for bulk requests will be handled at the individual equipment item level.');
  };

  const handleInlinePayment = async () => {
    if (!request.quote) return;
    
    setPaymentInProgress(true);
    setPaymentError('');
    
    try {
      const orderId = `bulk_${request.id}_${Date.now()}`;
      const paymentData = await api.createPaymentOrder({
        amount: request.quote.total_cost || 0,
        currency: request.quote.currency || 'INR',
        orderId: orderId,
        customerId: request.requester_email,
        customerName: request.requester_name,
        customerEmail: request.requester_email,
        customerPhone: request.contact_phone || '',
        serviceRequestId: request.id
      });

      setOrderId(orderId);
      
      // Open Razorpay
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: 'A-1 Fence Services',
        description: `Payment for Bulk Request ${request.id.slice(-8)}`,
        order_id: paymentData.id,
        handler: async (response: any) => {
          try {
            const verification = await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verification.success) {
              setPaymentId(response.razorpay_payment_id);
              setPaymentCompleted(true);
              
              // Update the request status
              const updatedRequest = await api.updateBulkServiceRequestStatus(
                request.id, 
                'approved', 
                user.email
              );
              
              setRequest(updatedRequest);
              onUpdate();
            } else {
              throw new Error('Payment verification failed');
            }
            
            console.log('Inline payment completed successfully!');
          } catch (error: any) {
            console.error('Inline payment failed:', error);
            setPaymentError(error.message);
          } finally {
            setPaymentInProgress(false);
          }
        },
        prefill: {
          name: request.requester_name,
          email: request.requester_email,
          contact: request.contact_phone || ''
        },
        theme: {
          color: '#3B82F6'
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
      
    } catch (error: any) {
      console.error('Payment initiation failed:', error);
      setPaymentError(error.message);
      setPaymentInProgress(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!paymentId || !orderId) return;
    
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();
      
      // Colors
      const primaryColor = [59, 130, 246]; // Blue-500
      const lightGray = [243, 244, 246]; // Gray-100
      const darkColor = [31, 41, 55]; // Gray-800
      
      // Header
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(0, 0, pageWidth, 30, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('A-1 Fence Services', 20, 20);
      
      // Title
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Payment Receipt', 20, 45);
      
      // Service Details Section
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.rect(20, 55, pageWidth - 40, 8, 'F');
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Bulk Service Request Details', 25, 61);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Request ID: ${request.id}`, 25, 70);
      pdf.text(`Requester: ${request.requester_name}`, 25, 75);
      pdf.text(`Company: ${request.company_name || 'N/A'}`, 25, 80);
      pdf.text(`Equipment Count: ${request.total_equipment_count}`, 25, 85);
      
      // Payment Information Section
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.rect(pageWidth / 2 + 5, 55, (pageWidth - 50) / 2, 8, 'F');
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Payment Information', pageWidth / 2 + 10, 61);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Payment ID: ${paymentId.slice(-12)}`, pageWidth / 2 + 10, 70);
      pdf.text(`Order ID: ${orderId.slice(-12)}`, pageWidth / 2 + 10, 75);
      pdf.text(`Payment Date: ${currentDate}`, pageWidth / 2 + 10, 80);
      pdf.text(`Payment Time: ${currentTime}`, pageWidth / 2 + 10, 85);
      
      // Amount Section
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.rect(20, 95, pageWidth - 40, 8, 'F');
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Payment Amount', 25, 101);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${request.quote?.currency === 'USD' ? '$' : '₹'}${request.quote?.total_cost}`, 25, 110);
      
      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Thank you for choosing A-1 Fence Services!', 20, pageWidth - 20);
      pdf.text('For any queries, contact us at support@a1fence.com', 20, pageWidth - 15);
      
      pdf.save(`bulk-payment-receipt-${request.id.slice(-8)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating receipt. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'under_review': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const renderTimeline = () => {
    const timelineSteps = [
      { status: 'pending', label: 'Pending', description: 'Request received and pending review' },
      { status: 'under_review', label: 'Under Review', description: 'EPR team analyzing equipment' },
      { status: 'approved', label: 'Approved', description: 'Quote approved, ready for repair' },
      { status: 'in_progress', label: 'In Progress', description: 'Repair work in progress' },
      { status: 'completed', label: 'Completed', description: 'All equipment repaired and ready' },
      { status: 'cancelled', label: 'Cancelled', description: 'Request cancelled' }
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Repair Progress</h3>
          <select
            value={timelineFilter}
            onChange={(e) => setTimelineFilter(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Steps</option>
            <option value="completed">Completed Only</option>
            <option value="pending">Pending Only</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-max space-x-4 pb-4">
            {timelineSteps.map((step, index) => {
              const isCompleted = BULK_WORKFLOW_STATUSES.indexOf(request.status) >= index;
              const isCurrent = request.status === step.status;
              
              if (timelineFilter === 'completed' && !isCompleted) return null;
              if (timelineFilter === 'pending' && isCompleted) return null;

              return (
                <div key={step.status} className="flex flex-col items-center min-w-20">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-xs sm:text-sm font-medium ${
                      isCompleted || isCurrent 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-16 sm:max-w-20">
                      {step.description}
                    </div>
                  </div>
                  {index < timelineSteps.length - 1 && (
                    <div className={`absolute top-3 sm:top-4 left-1/2 w-full h-0.5 sm:h-1 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`} style={{ transform: 'translateX(50%)', minWidth: '4rem' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderEquipmentItems = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Equipment Items</h3>
        {request.equipment_items.map((item, index) => (
          <div key={item.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Equipment Type</h4>
                <p className="text-sm text-gray-900 dark:text-white">{item.equipment_type}</p>
              </div>
              {item.equipment_model && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Model</h4>
                  <p className="text-sm text-gray-900 dark:text-white">{item.equipment_model}</p>
                </div>
              )}
              {item.serial_number && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Serial Number</h4>
                  <p className="text-sm text-gray-900 dark:text-white font-mono">{item.serial_number}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantity</h4>
                <p className="text-sm text-gray-900 dark:text-white">{item.quantity}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Issue Category</h4>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.issue_category === 'hardware' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  item.issue_category === 'software' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  item.issue_category === 'installation' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  item.issue_category === 'maintenance' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  item.issue_category === 'warranty' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {item.issue_category.toUpperCase()}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Severity</h4>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  item.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                  item.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {item.severity.toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Issue Description</h4>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded border">
                {item.issue_description}
              </p>
            </div>
            {item.epr_cost_estimation && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">EPR Cost Estimation</h4>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {item.epr_cost_estimation_currency === 'USD' ? '$' : '₹'}{item.epr_cost_estimation}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">EPR Status</h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    item.epr_status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    item.epr_status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {item.epr_status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderQuoteSection = () => {
    if (!request.quote) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Quote Available</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">A quote has not been generated for this bulk request yet.</p>
          
          {/* Show EPR Cost Estimation for Service Team */}
          {user.role === Role.Service && request.epr_cost_estimation && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">EPR Cost Estimation</h4>
              <p className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                {request.epr_cost_estimation_currency === 'USD' ? '$' : '₹'}{request.epr_cost_estimation}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Use this estimation to generate a quote for the channel partner/system integrator.
              </p>
            </div>
          )}
          
          {user.role === Role.Service && (
            <div className="space-y-3">
              <button
                onClick={() => setShowQuoteForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Generate Quote
              </button>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Service Team Role</h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Generate quote based on EPR cost estimation and send to channel partner/system integrator for approval.
                </p>
              </div>
            </div>
          )}
          {user.role === Role.EPR && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">EPR Team Role</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Your role is to provide cost estimation for equipment items. Once you complete the cost estimation, 
                the service team will generate a quote based on your estimation and send it to the channel partner/system integrator.
              </p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Show EPR Cost Estimation for Service Team */}
        {user.role === Role.Service && request.epr_cost_estimation && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">EPR Cost Estimation</h4>
            <p className="text-lg font-semibold text-blue-800 dark:text-blue-200">
              {request.epr_cost_estimation_currency === 'USD' ? '$' : '₹'}{request.epr_cost_estimation}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              This quote was generated based on the EPR team's cost estimation.
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quote Details</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Quote ID</h4>
              <p className="text-sm text-gray-900 dark:text-white font-mono">{request.quote.id || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Currency</h4>
              <p className="text-sm text-gray-900 dark:text-white">{request.quote.currency || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Cost</h4>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {request.quote.currency === 'USD' ? '$' : '₹'}{request.quote.total_cost || 0}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Status</h4>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                request.quote.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                request.quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {request.quote.status ? request.quote.status.toUpperCase() : 'UNKNOWN'}
              </span>
            </div>
          </div>

          {request.quote.items && request.quote.items.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Quote Items</h4>
              <div className="space-y-3">
                {request.quote.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Quantity: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {request.quote.currency === 'USD' ? '$' : '₹'}{item.total_cost || 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {request.quote.status === 'pending' && user.role === Role.Customer && (
            <div className="mt-6 space-y-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => handleQuoteAction(true)}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Approve Quote
                </button>
                <button
                  onClick={() => handleQuoteAction(false)}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Decline Quote
                </button>
              </div>
            </div>
          )}

          {request.quote.status === 'approved' && user.role === Role.Customer && (
            <div className="mt-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-green-800 dark:text-green-200 font-medium">Quote Approved</p>
                </div>
                <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                  Your quote has been approved. You can now proceed with payment.
                </p>
              </div>

              {!paymentCompleted ? (
                <div className="mt-4">
                  <button
                    onClick={handleInlinePayment}
                    disabled={paymentInProgress}
                    className="w-full bg-primary-600 text-white px-4 py-3 rounded-md hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {paymentInProgress ? 'Processing Payment...' : `Pay ${request.quote.currency === 'USD' ? '$' : '₹'}${request.quote.total_cost || 0}`}
                  </button>
                  {paymentError && (
                    <p className="text-red-600 text-sm mt-2">{paymentError}</p>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-green-800 dark:text-green-200 font-medium">Payment Successful!</p>
                      </div>
                      <button
                        onClick={handleDownloadReceipt}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 text-sm font-medium"
                      >
                        Download Receipt
                      </button>
                    </div>
                    <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                      Payment ID: {paymentId.slice(-12)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Enhanced Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to List
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Service Request</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Request ID: {request.id.slice(-8)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  request.status === 'completed' ? 'bg-green-500' :
                  request.status === 'in_progress' ? 'bg-blue-500' :
                  request.status === 'approved' ? 'bg-green-500' :
                  request.status === 'under_review' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`}></div>
                {request.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                {request.priority.toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Equipment Count</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{request.total_equipment_count}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">Estimated Value</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{request.estimated_total_value?.toFixed(0) || '0'}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Created</p>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{new Date(request.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Requester</p>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{request.requester_name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-1 p-1">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'details'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Details & EPR Timeline
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'timeline'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('equipment')}
              className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'equipment'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Equipment Items
            </button>
            <button
              onClick={() => setActiveTab('quote')}
              className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'quote'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Quote
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {activeTab === 'details' && (
            <div className="space-y-8">
              {/* Request Overview */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Request Overview
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Requester</p>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{request.requester_name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Email</p>
                        <p className="text-sm font-semibold text-green-900 dark:text-green-100">{request.requester_email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Company</p>
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">{request.company_name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              {(request.contact_phone || request.contact_email) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {request.contact_phone && (
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center">
                          <div className="p-2 bg-indigo-500 rounded-lg">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Phone</p>
                            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{request.contact_phone}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {request.contact_email && (
                      <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800">
                        <div className="flex items-center">
                          <div className="p-2 bg-teal-500 rounded-lg">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Email</p>
                            <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">{request.contact_email}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Update Section for Admin/Service/EPR */}
              {isAdmin && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Update Status
                  </h3>
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium shadow-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="under_review">Under Review (Diagnosis)</option>
                        <option value="approved">Approved</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button
                        onClick={handleStatusUpdate}
                        disabled={loading || newStatus === request.status}
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm flex items-center justify-center"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Update Status
                          </>
                        )}
                      </button>
                    </div>
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-red-600 dark:text-red-400 text-sm flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {error}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* EPR Timeline Section - Only visible to EPR team */}
              {user.role === Role.EPR && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    EPR Timeline
                  </h3>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                    <BulkEPRTimeline
                      request={request}
                      user={user}
                      onStatusUpdate={async (requestId, eprStatus, details, costEstimation, approvalDecision) => {
                        // Handle EPR status update
                        console.log('EPR status update:', { requestId, eprStatus, details, costEstimation, approvalDecision });
                        // Refresh the request data
                        onUpdate();
                      }}
                      onBack={() => setActiveTab('details')}
                    />
                  </div>
                </div>
              )}
          </div>
        )}

          {activeTab === 'timeline' && renderTimeline()}
          {activeTab === 'equipment' && renderEquipmentItems()}
          {activeTab === 'quote' && renderQuoteSection()}
        </div>
      </div>

      {/* Quote Form Modal */}
      {showQuoteForm && (
        <BulkQuoteForm
          requestId={request.id}
          user={user}
          onClose={() => setShowQuoteForm(false)}
          onSubmitSuccess={() => {
            setShowQuoteForm(false);
            // Refresh the request data
            onUpdate();
          }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && request.quote && (
        <PaymentModal
          quote={request.quote}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default BulkServiceRequestDetails;
