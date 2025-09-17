import React, { useState, useEffect } from 'react';
import { ServiceRequest, Role, Status, AppUser, AuditLogEntry, Quote } from '../../types';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';
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
  
  // Audit log state
  const [auditFilter, setAuditFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSortOrder, setAuditSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Inline payment state
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentId, setPaymentId] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');

  const isAdmin = user.role !== Role.Customer;
  const currentStepInfo = timelineSteps.indexOf(request.status);
  
  const handleStatusUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
        const updatedRequest = await api.updateRequestStatus(request.id, newStatus, user.email);
        setRequest(updatedRequest); // Update local state to reflect changes immediately
        onUpdate(); // Propagate update to parent

        // Create notification for customer about status update
        await api.createNotification({
          type: 'status',
          title: 'Status Update',
          message: `Your service request ${request.id.slice(-8)} status has been updated to: ${newStatus}`,
          customer_id: request.customer_id,
          service_request_id: request.id
        });

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
      // Update the service request to mark payment as completed
      const { data: updatedRequest, error: updateError } = await supabase
        .from('service_requests')
        .update({ 
          payment_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id)
        .select(`
          *,
          quotes (*)
        `)
        .single();

      if (updateError) {
        console.error('Error updating payment status:', updateError);
        throw updateError;
      }

      if (updatedRequest) {
        setRequest({
          ...updatedRequest,
          quote: updatedRequest.quotes?.[0] || null
        });
        onUpdate();
      }
      
      // Create payment success notification
      await api.createNotification({
        type: 'payment',
        title: 'Payment Successful',
        message: `Your payment of ${request.quote?.currency === 'USD' ? '$' : '₹'}${request.quote?.total_cost} has been processed successfully.`,
        customer_id: request.customer_id,
        service_request_id: request.id,
        payment_id: paymentId
      });
      
      console.log('Payment successful! Payment ID:', paymentId, 'Order ID:', orderId);
      
    } catch (error: any) {
      console.error('Error in payment success handler:', error);
      setError('Payment successful but failed to update request status. Please refresh the page.');
    }
  };

  const handlePaymentError = (error: string) => {
    setError(`Payment failed: ${error}`);
    setShowPaymentModal(false);
  };

  // Inline payment handler
  const handleInlinePayment = async () => {
    if (!request.quote) return;
    
    setPaymentInProgress(true);
    setPaymentError('');
    
    try {
      console.log('Starting inline payment process...');
      
      // Create order using API
      const orderData = await api.createPaymentOrder(request.id, request.quote.id, request.customer_id);
      console.log('Order created:', orderData);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate dummy payment response
      const dummyPaymentResponse = {
        razorpay_order_id: orderData.id,
        razorpay_payment_id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        razorpay_signature: `dummy_signature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      console.log('Dummy payment response:', dummyPaymentResponse);
      
      // Verify payment using API
      const isVerified = await api.verifyPayment(
        dummyPaymentResponse.razorpay_order_id,
        dummyPaymentResponse.razorpay_payment_id,
        dummyPaymentResponse.razorpay_signature,
        request.id,
        request.quote.id
      );
      
      if (isVerified) {
        console.log('Payment verification successful');
        setPaymentId(dummyPaymentResponse.razorpay_payment_id);
        setOrderId(dummyPaymentResponse.razorpay_order_id);
        setPaymentCompleted(true);
        
        // Update the request data to get the latest payment status
        console.log('🔄 Refreshing request data...');
        const updatedRequest = await api.getServiceRequestById(request.id);
        if (updatedRequest) {
          console.log('Request data refreshed:', updatedRequest.payment_completed);
          setRequest(updatedRequest);
          onUpdate();
        }
        
        console.log('Inline payment completed successfully!');
      } else {
        throw new Error('Payment verification failed');
      }
      
    } catch (error: any) {
      console.error('Inline payment failed:', error);
      setPaymentError(error.message);
    } finally {
      setPaymentInProgress(false);
    }
  };

  // Subscribe to real-time payment updates for this specific request
  useEffect(() => {
    if (!request.id) return;
    
    const subscription = api.subscribeToPayments((payload) => {
      console.log('Payment update received for request:', request.id, payload);
      
      // Check if this payment update is for our current request
      if (payload.new && payload.new.service_request_id === request.id) {
        console.log('Payment update for current request detected');
        
        // Update local state if payment was completed
        if (payload.new.status === 'captured') {
          setPaymentCompleted(true);
          setPaymentId(payload.new.razorpay_payment_id);
          setOrderId(payload.new.razorpay_order_id);
          
          // Refresh request data
          api.getServiceRequestById(request.id).then(updatedRequest => {
            if (updatedRequest) {
              setRequest(updatedRequest);
              onUpdate();
            }
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [request.id, onUpdate]);

  // Download receipt handler
  const handleDownloadReceipt = async () => {
    if (!request.quote) return;
    
    try {
      console.log('Starting PDF generation from ServiceRequestDetails...');
      
      // Dynamically import jsPDF
      const { jsPDF } = await import('jspdf');
      console.log('jsPDF imported successfully:', typeof jsPDF);
      
      // Create a new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      console.log('PDF document created, page size:', pageWidth, 'x', pageHeight);
      
      // Colors for the invoice
      const primaryColor = [220, 38, 38]; // Red-600
      const secondaryColor = [245, 158, 11]; // Amber-500
      const darkColor = [31, 41, 55]; // Gray-800
      const lightGray = [243, 244, 246]; // Gray-100
      const white = [255, 255, 255]; // White
      const successGreen = [34, 197, 94]; // Green-500
      
      // Header Section with gradient effect
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(0, 0, pageWidth, 50, 'F');
      
      // Add subtle border
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(0, 0, pageWidth, 50);
      
      // Company Logo/Name with better typography
      pdf.setTextColor(white[0], white[1], white[2]);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text('A-1 Fence Services', 25, 30);
      
      // Subtitle
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Professional Fence Solutions', 25, 37);
      
      // Invoice Title with better styling
      pdf.setTextColor(white[0], white[1], white[2]);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PAYMENT INVOICE', pageWidth - 25, 30, { align: 'right' });
      
      // Receipt Number with better formatting
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Receipt #: RCP-${Date.now()}`, pageWidth - 25, 40, { align: 'right' });
      
      // Date and Time with better spacing
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Date: ${currentDate}`, 25, 65);
      pdf.text(`Time: ${currentTime}`, 25, 70);
      
      // Payment Status Badge with rounded corners effect
      pdf.setFillColor(successGreen[0], successGreen[1], successGreen[2]);
      pdf.rect(pageWidth - 55, 60, 50, 18, 'F');
      pdf.setTextColor(white[0], white[1], white[2]);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PAID', pageWidth - 30, 72, { align: 'center' });
      
      // Customer Information Section with better styling
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.rect(20, 85, (pageWidth - 50) / 2, 8, 'F');
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Customer Information', 25, 91);
      
      // Customer details with better formatting
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Name: ${request.customer_name}`, 25, 100);
      pdf.text(`Customer ID: ${request.customer_id}`, 25, 105);
      pdf.text(`Service Request: #${request.id.slice(-8)}`, 25, 110);
      pdf.text(`Serial Number: ${request.serial_number}`, 25, 115);
      
      // Payment Information Section with better styling
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.rect(pageWidth / 2 + 5, 85, (pageWidth - 50) / 2, 8, 'F');
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Payment Information', pageWidth / 2 + 10, 91);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Payment ID: ${paymentId.slice(-12)}`, pageWidth / 2 + 10, 100);
      pdf.text(`Order ID: ${orderId.slice(-12)}`, pageWidth / 2 + 10, 105);
      pdf.text(`Payment Date: ${currentDate}`, pageWidth / 2 + 10, 110);
      pdf.text(`Payment Time: ${currentTime}`, pageWidth / 2 + 10, 115);
      
      // Service Details Section with better styling
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.rect(20, 125, pageWidth - 40, 8, 'F');
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Service Details', 25, 131);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Product Type: ${request.product_type}`, 25, 140);
      pdf.text(`Product Details: ${request.product_details}`, 25, 145);
      pdf.text(`Purchase Date: ${new Date(request.purchase_date).toLocaleDateString()}`, 25, 150);
      
      // Invoice Items Table Header with better styling
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(20, 160, pageWidth - 40, 12, 'F');
      
      pdf.setTextColor(white[0], white[1], white[2]);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Description', 25, 168);
      pdf.text('Amount', pageWidth - 25, 168, { align: 'right' });
      
      // Invoice Items with alternating row colors
      let yPosition = 172;
      request.quote.items.forEach((item, index) => {
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // Alternate row colors
        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250); // Very light gray
          pdf.rect(20, yPosition - 2, pageWidth - 40, 10, 'F');
        }
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        pdf.text(item.description, 25, yPosition + 2);
        pdf.text(`${item.currency === 'USD' ? '$' : '₹'}${item.cost}`, pageWidth - 25, yPosition + 2, { align: 'right' });
        yPosition += 10;
      });
      
      // Total Amount Section with enhanced styling
      yPosition += 5;
      pdf.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      pdf.rect(20, yPosition, pageWidth - 40, 15, 'F');
      
      // Add border to total section
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(20, yPosition, pageWidth - 40, 15);
      
      pdf.setTextColor(white[0], white[1], white[2]);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL AMOUNT', 25, yPosition + 10);
      pdf.text(`${request.quote.currency === 'USD' ? '$' : '₹'}${request.quote.total_cost}`, pageWidth - 25, yPosition + 10, { align: 'right' });
      
      // Payment Confirmation Section with enhanced styling
      yPosition += 25;
      pdf.setFillColor(240, 253, 244); // Green-50
      pdf.rect(20, yPosition, pageWidth - 40, 25, 'F');
      
      // Add border to confirmation section
      pdf.setDrawColor(34, 197, 94); // Green-500
      pdf.setLineWidth(1);
      pdf.rect(20, yPosition, pageWidth - 40, 25);
      
      pdf.setTextColor(22, 163, 74); // Green-600
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('✓ Payment Successful', 25, yPosition + 10);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Your payment has been processed successfully. Your service request is now being processed.', 25, yPosition + 18);
      
      // Footer with better styling
      yPosition = pageHeight - 40;
      
      // Footer background
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.rect(0, yPosition, pageWidth, 40, 'F');
      
      // Footer border
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(0, yPosition, pageWidth, 40);
      
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Thank you for choosing A-1 Fence Services!', pageWidth / 2, yPosition + 10, { align: 'center' });
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('For any queries, please contact us at support@a1fenceservices.com', pageWidth / 2, yPosition + 18, { align: 'center' });
      
      // Company Information
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128); // Gray-500
      pdf.text('A-1 Fence Services | Professional Fence Solutions', pageWidth / 2, yPosition + 30, { align: 'center' });
      
      console.log('PDF content added, saving file...');
      
      // Save the PDF
      const fileName = `payment-invoice-${request.id.slice(-8)}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      console.log('PDF saved successfully:', fileName);
      
      // Show success message
      alert('PDF invoice downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
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

            // Create notification for customer about quote
            await api.createNotification({
              type: 'quote',
              title: 'Repair Quote Ready',
              message: `Your repair quote for request ${request.id.slice(-8)} is ready for review. Amount: ${updatedRequest.quote?.currency === 'USD' ? '$' : '₹'}${updatedRequest.quote?.total_cost}`,
              customer_id: request.customer_id,
              service_request_id: request.id
            });
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                      <dd className="col-span-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                        {request.geolocation.split('|')[0].trim()}
                      </dd>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Service Center</dt>
                      <dd className="col-span-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                        {request.geolocation.split('|')[1]?.replace('Service Center:', '').trim()}
                      </dd>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Location Info</dt>
                    <dd className="col-span-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100">
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
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 sm:p-4 rounded-lg">
                <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Status & Actions</h3>
                <p className="mb-3 sm:mb-4 text-sm sm:text-base">Current Status: 
                    <span className="font-bold text-primary-600 dark:text-primary-400 ml-2">{request.status}</span>
                </p>
                {isAdmin ? (
                    <div className="space-y-3 sm:space-y-4">
                        {/* Talk to Customer Button */}
                        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Customer Contact</h4>
                            <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mb-3">
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
                            <span>{request.quote.currency === 'USD' ? '$' : '₹'}{item.cost.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <hr className="my-4 border-gray-300 dark:border-gray-600"/>
                <div className="flex justify-between font-bold text-lg">
                    <span>Total Cost</span>
                    <span>{request.quote.currency === 'USD' ? '$' : '₹'}{request.quote.total_cost.toFixed(2)}</span>
                </div>
                <div className="mt-6 text-center">
                    {request.quote.is_approved === null && user.role === Role.Customer && (
                        <div className="space-x-4">
                            <button onClick={() => handleQuoteAction(false)} disabled={loading} className="px-6 py-2 rounded-md text-white bg-red-600 hover:bg-red-700">Decline</button>
                            <button onClick={() => handleQuoteAction(true)} disabled={loading} className="px-6 py-2 rounded-md text-white bg-green-600 hover:bg-green-700">Approve</button>
                        </div>
                    )}
                    {request.quote.is_approved === true && (
                        <div className="space-y-6">
                            {/* Payment Status */}
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                                            Quote Approved
                                        </h3>
                                        <div className="mt-1 text-sm text-green-700 dark:text-green-300">
                                            Please proceed with payment to continue with the repair service.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Options */}
                            <div className="space-y-6">
                                {/* Payment Status */}
                                {paymentCompleted ? (
                                    /* Payment Success Message */
                                    <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="text-center">
                                            <div className="flex items-center justify-center mb-4">
                                                <svg className="w-12 h-12 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <h3 className="text-2xl font-bold text-green-800 dark:text-green-200">Payment Successful!</h3>
                                            </div>
                                            
                                            <p className="text-green-700 dark:text-green-300 mb-4">
                                                Your payment of {request.quote.currency === 'USD' ? '$' : '₹'}{request.quote.total_cost} has been processed successfully.
                                            </p>
                                            
                                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-4">
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-gray-600 dark:text-gray-400">Payment ID:</span>
                                                        <p className="font-medium text-gray-800 dark:text-white">{paymentId.slice(-12)}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600 dark:text-gray-400">Order ID:</span>
                                                        <p className="font-medium text-gray-800 dark:text-white">{orderId.slice(-12)}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                                                        <p className="font-medium text-gray-800 dark:text-white">{request.quote.currency === 'USD' ? '$' : '₹'}{request.quote.total_cost}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600 dark:text-gray-400">Date:</span>
                                                        <p className="font-medium text-gray-800 dark:text-white">{new Date().toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <button
                                                onClick={handleDownloadReceipt}
                                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors flex items-center justify-center mx-auto"
                                            >
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Download PDF Invoice
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Payment Options */
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Online Payment */}
                                        <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                                            <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Online Payment</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                                Pay securely using our test payment gateway. No real money will be charged.
                                            </p>
                                            
                                            {/* Payment Error */}
                                            {paymentError && (
                                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                                    {paymentError}
                                                </div>
                                            )}
                                            
                                            {/* Payment Status Display */}
                                            {request.payment_completed ? (
                                                <div className="text-center">
                                                    <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full">
                                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        Payment Completed
                                                    </div>
                                                    {user.role !== Role.Customer && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                                            Customer has successfully paid for this service request
                                                        </p>
                                                    )}
                                                </div>
                                            ) : user.role === Role.Customer ? (
                                                <button
                                                    onClick={handleInlinePayment}
                                                    disabled={paymentInProgress}
                                                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md font-semibold transition-colors flex items-center justify-center"
                                                >
                                                    {paymentInProgress ? (
                                                        <>
                                                            <Spinner />
                                                            <span className="ml-2">Processing Payment...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                            </svg>
                                                            Pay {request.quote.currency === 'USD' ? '$' : '₹'}{request.quote.total_cost}
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <div className="text-center">
                                                    <div className="inline-flex items-center px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">
                                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        ⏳ Payment Pending
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                                        Customer needs to complete payment before repair can proceed
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* QR Code Payment */}
                                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">📱 QR Code Payment</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                        Scan the QR code with your UPI app to make payment instantly.
                                    </p>
                                    
                                    {/* QR Code */}
                                    <div className="flex flex-col items-center space-y-3">
                                        <div className="w-32 h-32 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center p-2">
                                            <img 
                                                src="https://drive.google.com/uc?export=view&id=1lEPfaoXX-ykUXInoPVzjCWsm5f4HtHCI"
                                                alt="Payment QR Code"
                                                className="w-full h-full object-contain"
                                                onLoad={() => console.log('✅ QR Code image loaded successfully from Google Drive')}
                                                onError={(e) => {
                                                    console.error('❌ QR Code image failed to load from Google Drive:', e);
                                                    console.log('Trying alternative URL format...');
                                                    
                                                    // Try alternative URL format
                                                    const target = e.target as HTMLImageElement;
                                                    const alternativeUrl = "https://lh3.googleusercontent.com/d/1lEPfaoXX-ykUXInoPVzjCWsm5f4HtHCI";
                                                    
                                                    // Try the alternative URL
                                                    const img = new Image();
                                                    img.onload = () => {
                                                        console.log('✅ Alternative URL worked!');
                                                        target.src = alternativeUrl;
                                                    };
                                                    img.onerror = () => {
                                                        console.error('❌ Alternative URL also failed, showing fallback QR');
                                                        target.style.display = 'none';
                                                        const fallback = target.nextElementSibling as HTMLElement;
                                                        if (fallback) fallback.style.display = 'block';
                                                    };
                                                    img.src = alternativeUrl;
                                                }}
                                            />
                                            <div className="text-center hidden">
                                                <div className="w-24 h-24 bg-gray-900 rounded grid grid-cols-8 gap-0.5 p-1">
                                                    {Array.from({ length: 64 }).map((_, i) => (
                                                        <div 
                                                            key={i} 
                                                            className={`w-2 h-2 rounded-sm ${Math.random() > 0.5 ? 'bg-white' : 'bg-gray-900'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">UPI ID: a1fence@paytm</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Amount: {request.quote.currency === 'USD' ? '$' : '₹'}{request.quote.total_cost}</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                // Copy UPI payment details to clipboard
                                                const upiString = `upi://pay?pa=a1fence@paytm&pn=A-1%20Fence%20Services&am=${request.quote.total_cost}&cu=${request.quote.currency}&tn=Service%20Payment%20${request.id.slice(-8)}`;
                                                navigator.clipboard.writeText(upiString);
                                                alert('UPI payment link copied to clipboard!');
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            Copy UPI Link
                                        </button>
                                    </div>
                                </div>
                                    </div>
                                )}
                            </div>

                            {/* Payment Instructions */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Payment Instructions</h4>
                                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                    <li>• Payment is required before repair work begins</li>
                                    <li>• You will receive a payment receipt via email</li>
                                    <li>• Service team will be notified once payment is confirmed</li>
                                    <li>• For any payment issues, contact our support team</li>
                                </ul>
                            </div>
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


  const renderAuditLogTab = () => {
    // Combine all timeline and audit log data
    const allEntries = [];
    
    // Add main status timeline entries
    const statusTimeline = [
      {
        timestamp: request.created_at,
        type: 'status_change',
        action: 'Service Request Created',
        user: request.customer_name,
        details: 'Customer submitted service request',
        status: 'Received',
        icon: '📄',
        color: 'bg-gray-500',
        category: 'creation'
      }
    ];

    // Add EPR timeline entries
    if (request.epr_timeline && request.epr_timeline.length > 0) {
      request.epr_timeline.forEach(entry => {
        allEntries.push({
          timestamp: entry.timestamp,
          type: 'epr_action',
          action: entry.action,
          user: entry.user,
          details: entry.details,
          epr_status: entry.epr_status,
          cost_estimation: entry.cost_estimation,
          cost_estimation_currency: entry.cost_estimation_currency,
          approval_decision: entry.approval_decision,
          icon: '⚙',
          color: 'bg-blue-500',
          category: 'epr'
        });
      });
    }

    // Add quote-related entries
    if (request.quote) {
      allEntries.push({
        timestamp: request.quote.created_at,
        type: 'quote_created',
        action: 'Quote Generated',
        user: user.email,
        details: `Quote generated with total cost: ${request.quote.currency === 'USD' ? '$' : '₹'}${request.quote.total_cost}`,
        quote_amount: request.quote.total_cost,
        quote_currency: request.quote.currency,
        icon: '$',
        color: 'bg-green-500',
        category: 'quote'
      });

      if (request.quote.is_approved !== null) {
        allEntries.push({
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

    // Add audit log entries
    if (request.audit_log && request.audit_log.length > 0) {
      request.audit_log.forEach(log => {
        allEntries.push({
          timestamp: log.timestamp,
          type: log.type || 'system_action',
          action: log.action,
          user: log.user,
          details: log.details,
          metadata: log.metadata,
          icon: log.type === 'epr_action' ? '⚙' : log.type === 'service_action' ? '⚙' : log.type === 'customer_action' ? '👤' : '📄',
          color: log.type === 'epr_action' ? 'bg-blue-500' : log.type === 'service_action' ? 'bg-green-500' : log.type === 'customer_action' ? 'bg-purple-500' : 'bg-primary-500',
          category: log.type || 'audit'
        });
      });
    }

    // Combine and filter all entries
    const combinedEntries = [...statusTimeline, ...allEntries];
    
    // Apply filters
    let filteredEntries = combinedEntries;
    
    if (timelineFilter !== 'all') {
      filteredEntries = filteredEntries.filter(entry => entry.category === timelineFilter);
    }
    
    if (auditSearch) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        entry.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
        entry.user.toLowerCase().includes(auditSearch.toLowerCase())
      );
    }
    
    // Sort entries
    const sortedEntries = filteredEntries.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return auditSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return (
      <div className='p-4'>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Comprehensive Audit Log</h3>
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
              <option value="audit">Audit Log</option>
            </select>
            
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
                const exportData = {
                  requestId: request.id,
                  customerName: request.customer_name,
                  serialNumber: request.serial_number,
                  exportDate: new Date().toISOString(),
                  auditLog: sortedEntries.map(entry => ({
                    timestamp: entry.timestamp,
                    type: entry.type,
                    action: entry.action,
                    user: entry.user,
                    details: entry.details,
                    category: entry.category,
                    ...(entry.cost_estimation && { cost_estimation: entry.cost_estimation, cost_estimation_currency: entry.cost_estimation_currency }),
                    ...(entry.epr_status && { epr_status: entry.epr_status }),
                    ...(entry.quote_amount && { quote_amount: entry.quote_amount, quote_currency: entry.quote_currency }),
                    ...(entry.quote_decision && { quote_decision: entry.quote_decision }),
                    ...(entry.metadata && { metadata: entry.metadata })
                  }))
                };
                
                const dataStr = JSON.stringify(exportData, null, 2);
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
        
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
          <div className="space-y-6">
            {sortedEntries.map((entry, index) => (
              <div key={index} className="relative flex items-start">
                <div className={`${entry.color} rounded-full h-8 w-8 flex items-center justify-center text-white text-sm z-10 relative`}>
                  {entry.icon}
                </div>
                <div className="ml-6 flex-1 pb-6">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">{entry.action}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                          {entry.type}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
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

                    {entry.metadata && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Details:</p>
                        <div className="space-y-1">
                          {Object.entries(entry.metadata).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400 capitalize">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
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

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-4 sm:p-6 md:p-8">
      {/* Header Section with Back Button */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button onClick={onBack} className="flex items-center text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200 text-sm sm:text-base">
          <span className="mr-1">&larr;</span>
          <span className="hidden sm:inline">Back to list</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Service Request Details</h2>
          <p className="font-mono text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">ID: {request.id.slice(-12)}</p>
        </div>
        <div className="w-16 sm:w-20"></div> {/* Spacer for centering */}
      </div>

      {/* Assignment Information */}
      {request.assigned_service_team && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Assigned to: <span className="font-semibold">{request.assigned_service_team}</span>
            </span>
          </div>
        </div>
      )}

      {/* Status Timeline */}
      <div className="mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-700 dark:text-gray-200">Repair Progress</h3>
        <div className="overflow-x-auto">
          <div className="flex items-center min-w-max sm:min-w-0">
              {timelineSteps.map((status, index) => {
                  const isCompleted = index <= currentStepInfo;
                  const isCurrent = index === currentStepInfo;
                  return (
                      <React.Fragment key={status}>
                          <div className="flex flex-col items-center min-w-0 flex-shrink-0">
                              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${isCompleted ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500'}`}>
                                  {isCompleted && !isCurrent ? '✓' : index + 1}
                              </div>
                              <p className={`mt-1 sm:mt-2 text-xs text-center w-16 sm:w-20 px-1 ${isCurrent ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}>{status}</p>
                          </div>
                          {index < timelineSteps.length - 1 && <div className={`flex-1 h-1 min-w-4 sm:min-w-8 ${isCompleted ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'}`}></div>}
                      </React.Fragment>
                  )
              })}
          </div>
        </div>
      </div>
      
       <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Details</button>
                <button onClick={() => setActiveTab('quote')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'quote' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Quote</button>
                {(isAdmin || user.role === 'epr' || user.role === 'service') && <button onClick={() => setActiveTab('audit')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'audit' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Audit Log</button>}
            </nav>
        </div>

        <div>
            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'quote' && renderQuoteTab()}
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
