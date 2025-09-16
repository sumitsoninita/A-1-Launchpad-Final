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
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    console.log('handleDownload function called!');
    setIsGeneratingPDF(true);
    try {
      console.log('Starting PDF generation...');
      
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
      quote.items.forEach((item, index) => {
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
      pdf.text(`${quote.currency === 'USD' ? '$' : '₹'}${quote.total_cost}`, pageWidth - 25, yPosition + 10, { align: 'right' });
      
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
    } finally {
      setIsGeneratingPDF(false);
    }
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
            Print Receipt
          </button>
          <button
            onClick={handleDownload}
            disabled={isGeneratingPDF}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center space-x-2"
          >
            {isGeneratingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <span>📄</span>
                <span>Download PDF Invoice</span>
              </>
            )}
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
