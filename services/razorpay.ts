// Razorpay Configuration and Payment Service
import Razorpay from 'razorpay';

// Razorpay configuration
export const RAZORPAY_CONFIG = {
  key_id: 'rzp_test_RHstnu2TqLTrJt', // Your test key ID
  key_secret: '5e7wkdBxN0KthCfmir2gTACd', // Your test key secret
  currency: 'INR',
  name: 'A-1 Fence Services',
  description: 'Service Repair Payment',
  theme: {
    color: '#2563eb' // Blue theme to match your app
  }
};

// Initialize Razorpay instance (for server-side operations)
export const razorpay = new Razorpay({
  key_id: RAZORPAY_CONFIG.key_id,
  key_secret: RAZORPAY_CONFIG.key_secret
});

// Payment interface
export interface PaymentRequest {
  amount: number;
  currency: string;
  receipt: string;
  notes?: {
    service_request_id: string;
    customer_name: string;
    quote_id: string;
  };
}

export interface PaymentResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: any;
  created_at: number;
}

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  CAPTURED = 'captured',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

// Create payment order
export const createPaymentOrder = async (paymentData: PaymentRequest): Promise<PaymentResponse> => {
  try {
    const order = await razorpay.orders.create({
      amount: paymentData.amount * 100, // Razorpay expects amount in paise
      currency: paymentData.currency,
      receipt: paymentData.receipt,
      notes: paymentData.notes
    });

    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error('Failed to create payment order');
  }
};

// Verify payment signature
export const verifyPaymentSignature = (orderId: string, paymentId: string, signature: string): boolean => {
  try {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_CONFIG.key_secret)
      .update(orderId + '|' + paymentId)
      .digest('hex');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

// Get payment details
export const getPaymentDetails = async (paymentId: string) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw new Error('Failed to fetch payment details');
  }
};

// Refund payment
export const refundPayment = async (paymentId: string, amount?: number, notes?: string) => {
  try {
    const refundData: any = {
      payment_id: paymentId,
      notes: notes || 'Refund for service request'
    };
    
    if (amount) {
      refundData.amount = amount * 100; // Convert to paise
    }
    
    const refund = await razorpay.payments.refund(paymentId, refundData);
    return refund;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw new Error('Failed to process refund');
  }
};
