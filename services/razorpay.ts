// Razorpay Configuration and Payment Service
// Note: This is a client-side implementation with dummy data for testing

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

// Create payment order (dummy implementation for client-side testing)
export const createPaymentOrder = async (paymentData: PaymentRequest): Promise<PaymentResponse> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return dummy order data
    const order: PaymentResponse = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity: 'order',
      amount: paymentData.amount * 100, // Amount in paise
      amount_paid: 0,
      amount_due: paymentData.amount * 100,
      currency: paymentData.currency,
      receipt: paymentData.receipt,
      status: 'created',
      attempts: 0,
      notes: paymentData.notes || {},
      created_at: Math.floor(Date.now() / 1000)
    };

    console.log('🧪 Dummy payment order created:', order);
    return order;
  } catch (error) {
    console.error('Error creating dummy payment order:', error);
    throw new Error('Failed to create payment order');
  }
};

// Verify payment signature (dummy implementation for client-side testing)
export const verifyPaymentSignature = (orderId: string, paymentId: string, signature: string): boolean => {
  try {
    // For dummy implementation, always return true for test payments
    console.log('🧪 Dummy payment verification:', { orderId, paymentId, signature });
    
    // In a real implementation, this would verify the signature using crypto
    // For testing, we'll always return true if the IDs look valid
    const isValidOrder = orderId.startsWith('order_');
    const isValidPayment = paymentId.startsWith('pay_');
    
    const isVerified = isValidOrder && isValidPayment && signature.length > 10;
    console.log('🧪 Payment verification result:', isVerified);
    
    return isVerified;
  } catch (error) {
    console.error('Error verifying dummy payment signature:', error);
    return false;
  }
};

// Get payment details (dummy implementation for client-side testing)
export const getPaymentDetails = async (paymentId: string) => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return dummy payment details
    const payment = {
      id: paymentId,
      entity: 'payment',
      amount: 50000, // Dummy amount in paise
      currency: 'INR',
      status: 'captured',
      method: 'card',
      captured: true,
      order_id: `order_${Date.now()}`,
      created_at: Math.floor(Date.now() / 1000)
    };

    console.log('🧪 Dummy payment details:', payment);
    return payment;
  } catch (error) {
    console.error('Error fetching dummy payment details:', error);
    throw new Error('Failed to fetch payment details');
  }
};

// Refund payment (dummy implementation for client-side testing)
export const refundPayment = async (paymentId: string, amount?: number, notes?: string) => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return dummy refund data
    const refund = {
      id: `rfnd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity: 'refund',
      amount: amount ? amount * 100 : 50000, // Amount in paise
      currency: 'INR',
      payment_id: paymentId,
      notes: notes || 'Refund for service request',
      receipt: null,
      status: 'processed',
      created_at: Math.floor(Date.now() / 1000)
    };

    console.log('🧪 Dummy refund processed:', refund);
    return refund;
  } catch (error) {
    console.error('Error processing dummy refund:', error);
    throw new Error('Failed to process refund');
  }
};
