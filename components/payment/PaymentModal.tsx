import React, { useState, useEffect } from 'react';
import { ServiceRequest, Quote } from '../../types';
import { RAZORPAY_CONFIG, PaymentStatus } from '../../services/razorpay';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';
import PaymentReceipt from './PaymentReceipt';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ServiceRequest;
  quote: Quote;
  onPaymentSuccess: (paymentId: string, orderId: string) => void;
  onPaymentError: (error: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  request,
  quote,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentId, setPaymentId] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');

  // Load Razorpay script
  useEffect(() => {
    if (isOpen && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      
      script.onload = () => {
        console.log('Razorpay script loaded');
      };
      
      script.onerror = () => {
        setError('Failed to load payment gateway');
      };
    }
  }, [isOpen]);

  // Debug payment status changes
  useEffect(() => {
    console.log('🔍 Payment status changed to:', paymentStatus);
  }, [paymentStatus]);

  const handlePayment = async () => {
    console.log('🚀 Starting payment process...');
    setLoading(true);
    setError(null);

    try {
      console.log('📞 Calling createPaymentOrder API...');
      // Create order using API
      const orderData = await api.createPaymentOrder(request.id, quote.id, request.customer_id);
      console.log('✅ Order created:', orderData);

      // Simulate payment processing with dummy data
      console.log('🧪 Starting dummy payment flow...');
      
      // Simulate payment gateway loading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate dummy payment response
      const dummyPaymentResponse = {
        razorpay_order_id: orderData.id,
        razorpay_payment_id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        razorpay_signature: `dummy_signature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      console.log('🧪 Dummy payment response:', dummyPaymentResponse);
      
      setPaymentStatus(PaymentStatus.CAPTURED);
      console.log('🔧 Payment status set to:', PaymentStatus.CAPTURED);
      
      // Verify payment using API
      console.log('🔍 Verifying payment...');
      const isVerified = await api.verifyPayment(
        dummyPaymentResponse.razorpay_order_id,
        dummyPaymentResponse.razorpay_payment_id,
        dummyPaymentResponse.razorpay_signature,
        request.id,
        quote.id
      );
      console.log('✅ Payment verification result:', isVerified);

      if (isVerified) {
        setPaymentId(dummyPaymentResponse.razorpay_payment_id);
        setOrderId(dummyPaymentResponse.razorpay_order_id);
        
        // Show success message immediately
        console.log('✅ Payment verification successful!');
        console.log('✅ Payment status set to CAPTURED');
        console.log('✅ Payment ID set:', dummyPaymentResponse.razorpay_payment_id);
        console.log('✅ Order ID set:', dummyPaymentResponse.razorpay_order_id);
        
        // Don't call success callback immediately - let the user see the success message first
        // onPaymentSuccess(dummyPaymentResponse.razorpay_payment_id, dummyPaymentResponse.razorpay_order_id);
        
        console.log('✅ Dummy payment completed successfully!');
      } else {
        throw new Error('Payment verification failed');
      }

    } catch (error: any) {
      console.error('❌ Payment failed with error:', error);
      setError(error.message);
      onPaymentError(error.message);
      console.error('❌ Dummy payment failed:', error);
    } finally {
      console.log('🏁 Payment process finished, setting loading to false');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            🧪 Test Payment for Quote Approval
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quote Summary */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Quote Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Service Request:</span>
              <span className="font-medium text-gray-800 dark:text-white">#{request.id.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Customer:</span>
              <span className="font-medium text-gray-800 dark:text-white">{request.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Product:</span>
              <span className="font-medium text-gray-800 dark:text-white">{request.product_type}</span>
            </div>
            <hr className="border-gray-300 dark:border-gray-600" />
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-800 dark:text-white">Total Amount:</span>
              <span className="text-green-600 dark:text-green-400">
                {quote.currency === 'USD' ? '$' : '₹'}{quote.total_cost}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Items */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Payment Items</h3>
          <div className="space-y-2">
            {quote.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">{item.description}</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {item.currency === 'USD' ? '$' : '₹'}{item.cost}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Payment Status - Only show for non-success states */}
        {paymentStatus && paymentStatus !== PaymentStatus.CAPTURED && (
          <div className="mb-4 p-4 rounded-lg">
            {paymentStatus === PaymentStatus.CANCELLED && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                ⚠️ Payment was cancelled
              </div>
            )}
            {paymentStatus === PaymentStatus.FAILED && (
              <div className="bg-red-100 border border-red-400 text-red-700 rounded">
                ❌ Payment failed. Please try again.
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - Only show when payment is not successful */}
        {paymentStatus !== PaymentStatus.CAPTURED && (
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={loading || paymentStatus === PaymentStatus.CAPTURED}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-md transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Spinner />
                  <span className="ml-2">Processing...</span>
                </>
              ) : (
                `🧪 Test Pay ${quote.currency === 'USD' ? '$' : '₹'}${quote.total_cost}`
              )}
            </button>
          </div>
        )}

        {/* Payment Security Notice */}
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>🧪 Test payment environment - No real money will be charged</p>
          <p>This is a dummy payment flow for testing purposes</p>
          <p className="mt-2 text-red-500">DEBUG: Payment Status = {paymentStatus || 'null'}</p>
        </div>
      </div>

      {/* Payment Success Content */}
      {(paymentStatus === PaymentStatus.CAPTURED || paymentStatus === 'captured') && (
        console.log('🎉 Rendering success message section! Payment status:', paymentStatus) || true) && (
        <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-2xl font-bold text-green-800 dark:text-green-200">Payment Successful!</h3>
            </div>
            
            <p className="text-green-700 dark:text-green-300 mb-4">
              Your payment of {quote.currency === 'USD' ? '$' : '₹'}{quote.total_cost} has been processed successfully.
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
                  <p className="font-medium text-gray-800 dark:text-white">{quote.currency === 'USD' ? '$' : '₹'}{quote.total_cost}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                  <p className="font-medium text-gray-800 dark:text-white">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  // Download receipt
                  const receiptData = {
                    receipt_number: `RCP-${Date.now()}`,
                    payment_id: paymentId,
                    order_id: orderId,
                    customer_name: request.customer_name,
                    customer_id: request.customer_id,
                    service_request_id: request.id,
                    serial_number: request.serial_number,
                    product_type: request.product_type,
                    quote_items: quote.items,
                    total_amount: quote.total_cost,
                    currency: quote.currency,
                    payment_date: new Date().toISOString(),
                    company_name: 'A-1 Fence Services',
                    company_address: 'Your Company Address',
                    company_phone: 'Your Company Phone',
                    company_email: 'Your Company Email'
                  };

                  const dataStr = JSON.stringify(receiptData, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `payment-receipt-${request.id}-${new Date().toISOString().split('T')[0]}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Receipt
              </button>
              
              <button
                onClick={() => {
                  // Call success callback when user closes the modal
                  onPaymentSuccess(paymentId, orderId);
                  onClose();
                }}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentModal;
