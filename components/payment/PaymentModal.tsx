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

  const handlePayment = async () => {
    if (!window.Razorpay) {
      setError('Payment gateway not loaded. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create order using API
      const orderData = await api.createPaymentOrder(request.id, quote.id, request.customer_id);

      // Razorpay options
      const options = {
        key: RAZORPAY_CONFIG.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: RAZORPAY_CONFIG.name,
        description: `Payment for Service Request #${request.id.slice(-8)}`,
        order_id: orderData.id,
        receipt: orderData.receipt,
        theme: RAZORPAY_CONFIG.theme,
        handler: async function (response: any) {
          try {
            setPaymentStatus(PaymentStatus.CAPTURED);
            
            // Verify payment using API
            const isVerified = await api.verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              request.id,
              quote.id
            );

            if (isVerified) {
              setPaymentId(response.razorpay_payment_id);
              setOrderId(response.razorpay_order_id);
              setShowReceipt(true);
              onPaymentSuccess(response.razorpay_payment_id, response.razorpay_order_id);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error: any) {
            setError(error.message);
            onPaymentError(error.message);
          }
        },
        prefill: {
          name: request.customer_name,
          email: request.customer_id, // Assuming customer_id is email
          contact: '' // You might want to add phone number to your data
        },
        notes: {
          service_request_id: request.id,
          customer_name: request.customer_name,
          quote_id: quote.id
        },
        modal: {
          ondismiss: function() {
            setPaymentStatus(PaymentStatus.CANCELLED);
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      setError(error.message);
      onPaymentError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Payment for Quote Approval
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

        {/* Payment Status */}
        {paymentStatus && (
          <div className="mb-4 p-3 rounded">
            {paymentStatus === PaymentStatus.CAPTURED && (
              <div className="bg-green-100 border border-green-400 text-green-700 rounded">
                ✅ Payment successful! Processing your request...
              </div>
            )}
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

        {/* Action Buttons */}
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
              `Pay ${quote.currency === 'USD' ? '$' : '₹'}${quote.total_cost}`
            )}
          </button>
        </div>

        {/* Payment Security Notice */}
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>🔒 Secure payment powered by Razorpay</p>
          <p>Your payment information is encrypted and secure</p>
        </div>
      </div>

      {/* Payment Receipt */}
      {showReceipt && (
        <PaymentReceipt
          request={request}
          quote={quote}
          paymentId={paymentId}
          orderId={orderId}
          onClose={() => {
            setShowReceipt(false);
            onClose();
          }}
        />
      )}
    </div>
  );
};

export default PaymentModal;
