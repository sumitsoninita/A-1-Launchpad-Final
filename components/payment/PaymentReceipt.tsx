import React from 'react';
import { ServiceRequest, Quote } from '../../types';

interface PaymentReceiptProps {
  request: ServiceRequest;
  quote: Quote;
  paymentId: string;
  orderId: string;
  onClose: () => void;
}

const PaymentReceipt: React.FC<PaymentReceiptProps> = ({
  request,
  quote,
  paymentId,
  orderId,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
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
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 print:shadow-none print:rounded-none print:max-w-none print:w-full print:p-0">
        {/* Header */}
        <div className="text-center mb-6 print:mb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white print:text-black">A-1 Fence Services</h1>
          <p className="text-gray-600 dark:text-gray-400 print:text-black">Payment Receipt</p>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 print:text-black">
            Receipt #: RCP-{Date.now()}
          </div>
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white print:text-black mb-3">Payment Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 print:text-black">Payment ID:</span>
                <span className="font-medium text-gray-800 dark:text-white print:text-black">{paymentId.slice(-12)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 print:text-black">Order ID:</span>
                <span className="font-medium text-gray-800 dark:text-white print:text-black">{orderId.slice(-12)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 print:text-black">Payment Date:</span>
                <span className="font-medium text-gray-800 dark:text-white print:text-black">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 print:text-black">Payment Time:</span>
                <span className="font-medium text-gray-800 dark:text-white print:text-black">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white print:text-black mb-3">Customer Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 print:text-black">Name:</span>
                <span className="font-medium text-gray-800 dark:text-white print:text-black">{request.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 print:text-black">Customer ID:</span>
                <span className="font-medium text-gray-800 dark:text-white print:text-black">{request.customer_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 print:text-black">Service Request:</span>
                <span className="font-medium text-gray-800 dark:text-white print:text-black">#{request.id.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 print:text-black">Serial Number:</span>
                <span className="font-medium text-gray-800 dark:text-white print:text-black">{request.serial_number}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white print:text-black mb-3">Service Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 print:text-black">Product Type:</span>
              <span className="font-medium text-gray-800 dark:text-white print:text-black">{request.product_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 print:text-black">Product Details:</span>
              <span className="font-medium text-gray-800 dark:text-white print:text-black">{request.product_details}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 print:text-black">Purchase Date:</span>
              <span className="font-medium text-gray-800 dark:text-white print:text-black">
                {new Date(request.purchase_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Quote Items */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white print:text-black mb-3">Payment Breakdown</h3>
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden print:border-black">
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 print:bg-gray-100">
              <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-800 dark:text-white print:text-black">
                <div>Description</div>
                <div className="text-right">Amount</div>
              </div>
            </div>
            {quote.items.map((item, index) => (
              <div key={index} className="px-4 py-3 border-t border-gray-200 dark:border-gray-600 print:border-black">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-gray-800 dark:text-white print:text-black">{item.description}</div>
                  <div className="text-right font-medium text-gray-800 dark:text-white print:text-black">
                    {item.currency === 'USD' ? '$' : '₹'}{item.cost}
                  </div>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 print:bg-gray-100 print:border-black">
              <div className="grid grid-cols-2 gap-4 text-sm font-bold">
                <div className="text-gray-800 dark:text-white print:text-black">Total Amount</div>
                <div className="text-right text-green-600 dark:text-green-400 print:text-black">
                  {quote.currency === 'USD' ? '$' : '₹'}{quote.total_cost}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg print:bg-green-100 print:border-green-300">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200 print:text-black">
                Payment Successful
              </h3>
              <div className="mt-1 text-sm text-green-700 dark:text-green-300 print:text-black">
                Your payment has been processed successfully. Your service request is now being processed.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 print:text-black">
          <p>Thank you for choosing A-1 Fence Services!</p>
          <p>For any queries, please contact us at your-email@company.com</p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-6 print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            🖨️ Print Receipt
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            📥 Download Receipt
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceipt;
