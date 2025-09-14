import React, { useState } from 'react';
import { ServiceRequest, Role, Status, AppUser, AuditLogEntry, Quote } from '../../types';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';
import FeedbackForm from '../forms/FeedbackForm';
import QuoteForm from '../forms/QuoteForm';

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
      const updatedRequest = await api.updateQuoteStatus(request.id, isApproved, user.email);
      setRequest(updatedRequest);
      onUpdate();
    } catch(err:any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuoteSubmitted = async () => {
    setLoading(true);
    setError(null);
    try {
        const updatedRequest = await api.getServiceRequestById(request.id);
        if (updatedRequest) {
            setRequest(updatedRequest);
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

  const renderAuditLogTab = () => (
    <div className='p-4'>
        <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Activity Log</h3>
        <ul className="space-y-4">
            {request.audit_log.slice().reverse().map((log, index) => (
                <li key={index} className="flex items-start">
                    <div className="bg-primary-500 rounded-full h-3 w-3 mt-1.5 mr-3 flex-shrink-0"></div>
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{log.action}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">by {log.user} on {new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                </li>
            ))}
        </ul>
    </div>
  );

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
                {isAdmin && <button onClick={() => setActiveTab('audit')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'audit' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Audit Log</button>}
            </nav>
        </div>

        <div>
            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'quote' && renderQuoteTab()}
            {isAdmin && activeTab === 'audit' && renderAuditLogTab()}
        </div>

      {showFeedbackForm && <FeedbackForm requestId={request.id} onClose={() => setShowFeedbackForm(false)} />}
      {showQuoteForm && <QuoteForm requestId={request.id} onClose={() => setShowQuoteForm(false)} onSubmitSuccess={handleQuoteSubmitted} />}
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
