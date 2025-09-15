import React, { useState } from 'react';
import { ServiceRequest, Role, Status, AppUser, AuditLogEntry, Quote } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';
import FeedbackForm from '../forms/FeedbackForm';
import QuoteForm from '../forms/QuoteForm';
import PaymentModal from '../payment/PaymentModal';

const WORKFLOW_STATUSES: Status[] = Object.values(Status);

interface ServiceRequestDetailsProps {
  request: ServiceRequest;
  onBack: () => void;
  user: AppUser;
  onUpdate: () => void;
}

const timelineSteps = [Status.Received, Status.Diagnosis, Status.AwaitingApproval, Status.RepairInProgress, Status.QualityCheck, Status.Dispatched, Status.Completed];


const ServiceRequestDetails: React.FC<ServiceRequestDetailsProps> = ({ request: initialRequest, onBack, user, onUpdate }) => {
  const [request, setRequest] = useState(initialRequest);
  const [newStatus, setNewStatus] = useState<Status>(request.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Timeline state
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Audit log state
  const [auditFilter, setAuditFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSortOrder, setAuditSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const isAdmin = user.role !== Role.Customer;
  const currentStepInfo = timelineSteps.indexOf(request.status);
  
  const handleStatusUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
        const updatedRequest = await api.updateRequestStatus(request.id, newStatus, user.email);
        setRequest(updatedRequest); // Update local state to reflect changes immediately
        onUpdate(); // Propagate update to parent
        alert('Status updated successfully!');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };
  
  const handleQuoteAction = async (isApproved: boolean) => {
    if (!request.quote) return;
    setLoading(true);
    try {
      // First update the quote status
      const updatedRequest = await api.updateQuoteStatus(request.id, isApproved, user.email);
      
      // Then update the main status and EPR status based on customer decision
      const finalRequest = await api.updateStatusAfterQuoteDecision(request.id, isApproved, user.email);
      
      setRequest(finalRequest);
      onUpdate();
    } catch(err:any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string, orderId: string) => {
    try {
      // Refresh the request data to get updated payment status
      const updatedRequest = await api.getServiceRequest(request.id);
      if (updatedRequest) {
        setRequest(updatedRequest);
        onUpdate();
      }
      setShowPaymentModal(false);
      alert('Payment successful! Your service request is now being processed.');
    } catch (error: any) {
      setError('Payment successful but failed to update request status. Please refresh the page.');
    }
  };

  const handlePaymentError = (error: string) => {
    setError(`Payment failed: ${error}`);
    setShowPaymentModal(false);
  };
  
  const handleQuoteSubmitted = async () => {
    setLoading(true);
    setError(null);
    try {
        // First get the updated request with the new quote
        const updatedRequest = await api.getServiceRequestById(request.id);
        if (updatedRequest) {
            // Then update status to "Awaiting Approval" since quote is ready
            const finalRequest = await api.updateStatusToAwaitingApproval(request.id, user.email);
            setRequest(finalRequest);
        }
        onUpdate();
    } catch (err: any) {
        setError(err.message);
    } finally {
        setShowQuoteForm(false);
        setLoading(false);
    }
  };


  const renderDetailsTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <DetailSection title="Customer & Product Information">
            <DetailItem label="Customer Name" value={request.customer_name} />
            {request.customer_phone && <DetailItem label="Phone Number" value={request.customer_phone} />}
            <DetailItem label="Serial Number" value={request.serial_number} />
            <DetailItem label="Product Type" value={request.product_type} />
            {request.product_details && <DetailItem label="Product Details" value={request.product_details} />}
            <DetailItem label="Purchase Date" value={new Date(request.purchase_date).toLocaleDateString()} />
            <DetailItem label="Warranty Claim" value={request.is_warranty_claim ? 'Yes' : 'No'} />
          </DetailSection>

          <DetailSection title="Location & Service Center">
            {request.geolocation && (
              <div className="space-y-2">
                {request.geolocation.includes('|') ? (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                      <dd className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                        {request.geolocation.split('|')[0].trim()}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Service Center</dt>
                      <dd className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                        {request.geolocation.split('|')[1]?.replace('Service Center:', '').trim()}
                      </dd>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Location Info</dt>
                    <dd className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                      {request.geolocation}
                    </dd>
                  </div>
                )}
              </div>
            )}
          </DetailSection>

          <DetailSection title="Fault Description">
             <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{request.fault_description}</p>
          </DetailSection>

          <DetailSection title="Submitted Photos">
            <div className="flex flex-wrap gap-4">
                {request.image_urls && request.image_urls.length > 0 ? request.image_urls.map((url, index) => (
                    <div key={index} className="relative group">
                        <img 
                            src={url} 
                            alt={`product photo ${index+1}`} 
                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:opacity-80 transition-opacity cursor-pointer"
                            onClick={() => {
                                // Open image in new tab/window
                                const newWindow = window.open();
                                if (newWindow) {
                                    newWindow.document.write(`
                                        <html>
                                            <head><title>Product Photo ${index + 1}</title></head>
                                            <body style="margin:0; padding:20px; background:#f5f5f5; display:flex; justify-content:center; align-items:center; min-height:100vh;">
                                                <img src="${url}" style="max-width:100%; max-height:100%; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15);" />
                                            </body>
                                        </html>
                                    `);
                                }
                            }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">Click to view</span>
                        </div>
                    </div>
                )) : <p className="text-gray-500 dark:text-gray-400 text-sm">No photos submitted.</p>}
            </div>
          </DetailSection>
        </div>
        <div className="md:col-span-1 space-y-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Status & Actions</h3>
                <p className="mb-4">Current Status: 
                    <span className="font-bold text-primary-600 dark:text-primary-400 ml-2">{request.status}</span>
                </p>
                {isAdmin ? (
                    <div className="space-y-4">
                        {/* Talk to Customer Button */}
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Customer Contact</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                                Customer: <strong>{request.customer_name}</strong><br/>
                                {request.customer_phone ? (
                                    <>Phone: <strong>{request.customer_phone}</strong></>
                                ) : (
                                    <span className="text-yellow-600 dark:text-yellow-400">No phone number provided</span>
                                )}
                            </p>
                            {request.customer_phone ? (
                                <button 
                                    onClick={() => {
                                        if (navigator.clipboard) {
                                            navigator.clipboard.writeText(request.customer_phone!);
                                            alert(`Phone number copied to clipboard: ${request.customer_phone}`);
                                        } else {
                                            // Fallback for older browsers
                                            const textArea = document.createElement('textarea');
                                            textArea.value = request.customer_phone!;
                                            document.body.appendChild(textArea);
                                            textArea.select();
                                            document.execCommand('copy');
                                            document.body.removeChild(textArea);
                                            alert(`Phone number copied to clipboard: ${request.customer_phone}`);
                                        }
                                    }}
                                    className="w-full flex items-center justify-center py-2 px-4 border border-blue-300 dark:border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    Talk to Customer
                                </button>
                            ) : (
                                <div className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 text-center">
                                    No phone number available
                                </div>
                            )}
                        </div>

                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Update Status</label>
                        <select
                            id="status"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as Status)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        >
                            {WORKFLOW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={handleStatusUpdate} disabled={loading || newStatus === request.status} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {loading ? <Spinner small /> : "Update Status"}
                        </button>
                         {!request.quote && request.status === Status.Diagnosis && (
                            <button onClick={() => setShowQuoteForm(true)} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400">
                                Generate Quote
                            </button>
                        )}
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                ) : (
                    <>
                        {(request.status === Status.Completed || request.status === Status.Dispatched) && (
                            <button onClick={() => setShowFeedbackForm(true)} className="w-full py-2 px-4 border border-primary-500 rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                Provide Feedback
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    </div>
  );

  const renderQuoteTab = () => (
    <div className='p-4'>
        {!request.quote ? (
            <p className="text-gray-500 dark:text-gray-400 text-center">No quote has been generated for this request yet.</p>
        ) : (
            <div className="max-w-2xl mx-auto bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                <h3 className="text-2xl font-bold mb-4">Repair Quote</h3>
                <div className="space-y-2 mb-4">
                    {request.quote.items.map((item, i) => (
                        <div key={i} className="flex justify-between">
                            <span>{item.description}</span>
                            <span>${item.cost.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <hr className="my-4 border-gray-300 dark:border-gray-600"/>
                <div className="flex justify-between font-bold text-lg">
                    <span>Total Cost</span>
                    <span>${request.quote.total_cost.toFixed(2)}</span>
                </div>
                <div className="mt-6 text-center">
                    {request.quote.is_approved === null && user.role === Role.Customer && (
                        <div className="space-x-4">
                            <button onClick={() => handleQuoteAction(false)} disabled={loading} className="px-6 py-2 rounded-md text-white bg-red-600 hover:bg-red-700">Decline</button>
                            <button onClick={() => handleQuoteAction(true)} disabled={loading} className="px-6 py-2 rounded-md text-white bg-green-600 hover:bg-green-700">Approve</button>
                        </div>
                    )}
                    {request.quote.is_approved === true && (
                        <div>
                            <p className="text-green-600 font-semibold mb-4">Quote Approved. Please proceed with payment.</p>
                            {user.role === Role.Customer && !request.payment_completed && (
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors"
                                >
                                    💳 Pay {request.quote.currency === 'USD' ? '$' : '₹'}{request.quote.total_cost}
                                </button>
                            )}
                            {request.payment_completed && (
                                <p className="text-green-600 font-semibold">✅ Payment Completed</p>
                            )}
                            {request.quote.payment_qr_code_url && <img src={request.quote.payment_qr_code_url} alt="Payment QR Code" className="mx-auto" />}
                        </div>
                    )}
                    {request.quote.is_approved === false && <p className="text-red-600 font-semibold">Quote Declined.</p>}
                     {request.quote.is_approved !== null && user.role !== Role.Customer && (
                         <p className={`font-semibold ${request.quote.is_approved ? 'text-green-600' : 'text-red-600'}`}>
                            Quote was {request.quote.is_approved ? 'Approved' : 'Declined'} by customer.
                         </p>
                     )}
                </div>
            </div>
        )}
    </div>
  );

  const renderComprehensiveTimeline = () => {
    // Combine all timeline data
    const allTimelineEntries = [];
    
    // Add main status timeline entries
    const statusTimeline = [
      {
        timestamp: request.created_at,
        type: 'status_change',
        action: 'Service Request Created',
        user: request.customer_name,
        details: 'Customer submitted service request',
        status: 'Received',
        icon: '📝',
        color: 'bg-gray-500',
        category: 'creation'
      }
    ];

    // Add EPR timeline entries
    if (request.epr_timeline && request.epr_timeline.length > 0) {
      request.epr_timeline.forEach(entry => {
        allTimelineEntries.push({
          timestamp: entry.timestamp,
          type: 'epr_action',
          action: entry.action,
          user: entry.user,
          details: entry.details,
          epr_status: entry.epr_status,
          cost_estimation: entry.cost_estimation,
          cost_estimation_currency: entry.cost_estimation_currency,
          approval_decision: entry.approval_decision,
          icon: '🔧',
          color: 'bg-blue-500',
          category: 'epr'
        });
      });
    }

    // Add quote-related entries
    if (request.quote) {
      allTimelineEntries.push({
        timestamp: request.quote.created_at,
        type: 'quote_created',
        action: 'Quote Generated',
        user: 'Service Team',
        details: `Quote generated with total cost: ${request.quote.currency === 'USD' ? '$' : '₹'}${request.quote.total_cost}`,
        quote_amount: request.quote.total_cost,
        quote_currency: request.quote.currency,
        icon: '💰',
        color: 'bg-green-500',
        category: 'quote'
      });

      if (request.quote.is_approved !== null) {
        allTimelineEntries.push({
          timestamp: request.updated_at,
          type: 'customer_decision',
          action: `Customer ${request.quote.is_approved ? 'Approved' : 'Rejected'} Quote`,
          user: 'Customer',
          details: `Customer ${request.quote.is_approved ? 'approved' : 'rejected'} the quote`,
          quote_decision: request.quote.is_approved ? 'approved' : 'rejected',
          icon: '👤',
          color: 'bg-purple-500',
          category: 'customer_action'
        });
      }
    }

    // Combine and filter timeline entries
    const combinedTimeline = [...statusTimeline, ...allTimelineEntries];
    
    // Apply filters
    let filteredTimeline = combinedTimeline;
    
    if (timelineFilter !== 'all') {
      filteredTimeline = filteredTimeline.filter(entry => entry.category === timelineFilter);
    }
    
    if (searchTerm) {
      filteredTimeline = filteredTimeline.filter(entry => 
        entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort timeline entries
    const sortedTimeline = filteredTimeline.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return (
      <div className='p-4'>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Comprehensive Timeline</h3>
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search timeline..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter */}
            <select
              value={timelineFilter}
              onChange={(e) => setTimelineFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Activities</option>
              <option value="creation">Creation</option>
              <option value="epr">EPR Actions</option>
              <option value="quote">Quotes</option>
              <option value="customer_action">Customer Actions</option>
            </select>
            
            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            
            {/* Export Button */}
            <button
              onClick={() => {
                const exportData = {
                  requestId: request.id,
                  customerName: request.customer_name,
                  serialNumber: request.serial_number,
                  exportDate: new Date().toISOString(),
                  timeline: sortedTimeline.map(entry => ({
                    timestamp: entry.timestamp,
                    type: entry.type,
                    action: entry.action,
                    user: entry.user,
                    details: entry.details,
                    category: entry.category,
                    ...(entry.cost_estimation && { cost_estimation: entry.cost_estimation, cost_estimation_currency: entry.cost_estimation_currency }),
                    ...(entry.epr_status && { epr_status: entry.epr_status }),
                    ...(entry.quote_amount && { quote_amount: entry.quote_amount, quote_currency: entry.quote_currency }),
                    ...(entry.quote_decision && { quote_decision: entry.quote_decision })
                  }))
                };
                
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `timeline-${request.id}-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Export Timeline
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
          <div className="space-y-6">
            {sortedTimeline.map((entry, index) => (
              <div key={index} className="relative flex items-start">
                <div className={`${entry.color} rounded-full h-8 w-8 flex items-center justify-center text-white text-sm z-10 relative`}>
                  {entry.icon}
                </div>
                <div className="ml-6 flex-1 pb-6">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">{entry.action}</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      by <span className="font-medium">{entry.user}</span>
                    </p>
                    {entry.details && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{entry.details}</p>
                    )}
                    
                    {/* Show additional details based on entry type */}
                    {entry.cost_estimation && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Cost Estimation: {entry.cost_estimation_currency === 'USD' ? '$' : '₹'}{entry.cost_estimation}
                        </p>
                      </div>
                    )}
                    
                    {entry.epr_status && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded">
                          EPR Status: {entry.epr_status}
                        </span>
                      </div>
                    )}
                    
                    {entry.quote_amount && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Quote Amount: {entry.quote_currency === 'USD' ? '$' : '₹'}{entry.quote_amount}
                        </p>
                      </div>
                    )}
                    
                    {entry.quote_decision && (
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          entry.quote_decision === 'approved' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          Quote: {entry.quote_decision}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAuditLogTab = () => {
    // Filter and sort audit log entries
    let filteredAuditLog = request.audit_log || [];
    
    if (auditSearch) {
      filteredAuditLog = filteredAuditLog.filter(log => 
        log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(auditSearch.toLowerCase()))
      );
    }
    
    const sortedAuditLog = filteredAuditLog.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return auditSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
    
    return (
      <div className='p-4'>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Comprehensive Activity Log</h3>
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search audit log..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Sort Order */}
            <select
              value={auditSortOrder}
              onChange={(e) => setAuditSortOrder(e.target.value as 'newest' | 'oldest')}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            
            {/* Export Button */}
            <button
              onClick={() => {
                const dataStr = JSON.stringify(sortedAuditLog, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `audit-log-${request.id}-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Export JSON
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
            {sortedAuditLog.map((log, index) => {
                const getLogIcon = (type: string) => {
                    switch (type) {
                        case 'epr_action':
                            return '🔧';
                        case 'service_action':
                            return '⚙️';
                        case 'customer_action':
                            return '👤';
                        default:
                            return '📝';
                    }
                };

                const getLogColor = (type: string) => {
                    switch (type) {
                        case 'epr_action':
                            return 'bg-blue-500';
                        case 'service_action':
                            return 'bg-green-500';
                        case 'customer_action':
                            return 'bg-purple-500';
                        default:
                            return 'bg-primary-500';
                    }
                };

                return (
                    <li key={index} className="flex items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className={`${getLogColor(log.type || 'default')} rounded-full h-8 w-8 mt-1 mr-4 flex-shrink-0 flex items-center justify-center text-white text-sm`}>
                            {getLogIcon(log.type || 'default')}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{log.action}</p>
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                                    {log.type || 'system'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                by {log.user} on {new Date(log.timestamp).toLocaleString()}
                            </p>
                            {log.details && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{log.details}</p>
                            )}
                            {log.cost_estimation && (
                                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                        Cost Estimation: {log.cost_estimation_currency === 'USD' ? '$' : '₹'}{log.cost_estimation}
                                    </p>
                                </div>
                            )}
                            {log.epr_status && (
                                <div className="mt-2">
                                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded">
                                        EPR Status: {log.epr_status}
                                    </span>
                                </div>
                            )}
                            {log.quote_decision && (
                                <div className="mt-2">
                                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                        log.quote_decision === 'approved' 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                    }`}>
                                        Quote: {log.quote_decision}
                                    </span>
                                </div>
                            )}
                        </div>
                    </li>
                );
            })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6 md:p-8 relative">
      <button onClick={onBack} className="absolute top-4 left-4 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">
          &larr; Back to list
      </button>

      <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">Service Request Details</h2>
      <p className="text-center font-mono text-sm text-gray-500 dark:text-gray-400 mb-8">ID: {request.id.slice(-12)}</p>

      {/* Status Timeline */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Repair Progress</h3>
        <div className="flex items-center">
            {timelineSteps.map((status, index) => {
                const isCompleted = index <= currentStepInfo;
                const isCurrent = index === currentStepInfo;
                return (
                    <React.Fragment key={status}>
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500'}`}>
                                {isCompleted && !isCurrent ? '✓' : index + 1}
                            </div>
                            <p className={`mt-2 text-xs text-center w-20 ${isCurrent ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}>{status}</p>
                        </div>
                        {index < timelineSteps.length - 1 && <div className={`flex-1 h-1 ${isCompleted ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'}`}></div>}
                    </React.Fragment>
                )
            })}
        </div>
      </div>
      
       <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Details</button>
                <button onClick={() => setActiveTab('quote')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'quote' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Quote</button>
                <button onClick={() => setActiveTab('timeline')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'timeline' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Comprehensive Timeline</button>
                {(isAdmin || user.role === 'epr' || user.role === 'service') && <button onClick={() => setActiveTab('audit')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'audit' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Audit Log</button>}
            </nav>
        </div>

        <div>
            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'quote' && renderQuoteTab()}
            {activeTab === 'timeline' && renderComprehensiveTimeline()}
            {(isAdmin || user.role === 'epr' || user.role === 'service') && activeTab === 'audit' && renderAuditLogTab()}
        </div>

      {showFeedbackForm && <FeedbackForm requestId={request.id} onClose={() => setShowFeedbackForm(false)} />}
      {showQuoteForm && <QuoteForm requestId={request.id} onClose={() => setShowQuoteForm(false)} onSubmitSuccess={handleQuoteSubmitted} />}
      {showPaymentModal && request.quote && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          request={request}
          quote={request.quote}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      )}
    </div>
  );
};

const DetailSection: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
    <div>
        <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-600 pb-2 mb-4 text-gray-700 dark:text-gray-200">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);
const DetailItem: React.FC<{label: string; value: string}> = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-4">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="col-span-2 text-sm text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
);

export default ServiceRequestDetails;
