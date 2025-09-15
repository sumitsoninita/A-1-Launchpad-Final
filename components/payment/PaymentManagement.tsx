import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Spinner from '../shared/Spinner';

interface Payment {
  id: string;
  service_request_id: string;
  quote_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  customer_name: string;
  customer_email: string;
  payment_method: string;
  payment_captured_at: string;
  refund_amount: number;
  refund_status: string;
  created_at: string;
  serial_number: string;
  product_type: string;
  service_status: string;
  quote_amount: number;
  quote_approved: boolean;
}

interface PaymentManagementProps {
  user: any;
}

const PaymentManagement: React.FC<PaymentManagementProps> = ({ user }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      // This would need to be implemented in your API
      // For now, we'll simulate the data
      const mockPayments: Payment[] = [
        {
          id: '1',
          service_request_id: 'req-123',
          quote_id: 'quote-123',
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_123',
          amount: 1500,
          currency: 'INR',
          status: 'captured',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          payment_method: 'card',
          payment_captured_at: '2024-01-15T10:30:00Z',
          refund_amount: 0,
          refund_status: '',
          created_at: '2024-01-15T10:25:00Z',
          serial_number: 'SN-ABC123',
          product_type: 'Energizer Product',
          service_status: 'Repair in Progress',
          quote_amount: 1500,
          quote_approved: true
        }
      ];
      setPayments(mockPayments);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedPayment) return;

    try {
      setRefundLoading(true);
      await api.processRefund(
        selectedPayment.razorpay_payment_id,
        refundAmount || undefined,
        refundReason
      );
      
      setShowRefundModal(false);
      setRefundAmount(0);
      setRefundReason('');
      fetchPayments(); // Refresh the list
      alert('Refund processed successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefundLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'captured':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'refunded':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Payment Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage payments, refunds, and payment history</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Payment History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Payment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {payment.razorpay_payment_id.slice(-8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div>
                      <div className="font-medium">{payment.customer_name}</div>
                      <div className="text-xs">{payment.serial_number}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {payment.currency === 'USD' ? '$' : '₹'}{payment.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {new Date(payment.payment_captured_at || payment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setRefundAmount(payment.amount);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View Details
                      </button>
                      {payment.status === 'captured' && payment.refund_amount === 0 && (
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setRefundAmount(payment.amount);
                            setShowRefundModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Process Refund
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment ID: {selectedPayment.razorpay_payment_id.slice(-8)}
                </label>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Customer: {selectedPayment.customer_name}
                </label>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Original Amount: {selectedPayment.currency === 'USD' ? '$' : '₹'}{selectedPayment.amount}
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refund Amount
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  max={selectedPayment.amount}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refund Reason
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter reason for refund..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={refundLoading || refundAmount <= 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-md transition-colors flex items-center"
              >
                {refundLoading ? (
                  <>
                    <Spinner />
                    <span className="ml-2">Processing...</span>
                  </>
                ) : (
                  `Refund ${selectedPayment.currency === 'USD' ? '$' : '₹'}${refundAmount}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
