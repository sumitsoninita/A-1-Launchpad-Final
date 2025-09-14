import React, { useState } from 'react';

interface FAQProps {
  onBack: () => void;
}

const FAQ: React.FC<FAQProps> = ({ onBack }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const faqData = [
    // Getting Started
    {
      question: "How do I submit a new service request?",
      answer: "From your Customer Dashboard, click the 'Submit New Request' button and fill out the form with all the required details about your product and the issue you're facing. Make sure to include your serial number, product type, purchase date, and a detailed description of the problem."
    },
    {
      question: "What information do I need to submit a service request?",
      answer: "You'll need: your contact information, product serial number, product type (Energizer Product, Power Adapter, or Gate Motor Controller), purchase date, detailed fault description, your address, preferred service center (Maharashtra, Gujarat, or Dubai), and photos of the issue if applicable."
    },
    {
      question: "How do I find my product serial number?",
      answer: "The serial number is usually located on a label or sticker on your product. For Energizer products, check the back or bottom of the device. For power adapters, look on the label near the power input. For gate motor controllers, check the control box or motor unit. You can also use the QR code scanner in the service request form to automatically capture it."
    },
    
    // Service Request Tracking
    {
      question: "How can I track the status of my repair?",
      answer: "You can see the real-time status of all your service requests on your Customer Dashboard. The status timeline in the request details view shows exactly which stage your repair is in: Received → Diagnosis → Awaiting Approval → Repair in Progress → Quality Check → Dispatched → Completed."
    },
    {
      question: "What do the different status updates mean?",
      answer: "• Received: Your request has been submitted and logged. • Diagnosis: Our technicians are examining your product. • Awaiting Approval: A repair quote is being prepared for your approval. • Repair in Progress: Your product is being repaired. • Quality Check: Final testing and quality assurance. • Dispatched: Your repaired product is being shipped back. • Completed: Your product has been delivered and the case is closed."
    },
    {
      question: "How will I be notified about status updates?",
      answer: "You'll receive email notifications at each major status change. You can also check your Customer Dashboard anytime to see the current status and detailed timeline of your service request."
    },
    
    // Repair Process & Timeline
    {
      question: "How long does a typical repair take?",
      answer: "Repair times vary depending on the complexity of the issue and parts availability: Simple repairs (1-3 business days), Moderate repairs (3-7 business days), Complex repairs (7-14 business days). You'll receive notifications as your device moves through each repair stage."
    },
    {
      question: "What happens during the diagnosis phase?",
      answer: "Our certified technicians thoroughly examine your product to identify the root cause of the issue. This includes testing all components, checking for warranty coverage, and determining the best repair approach. You'll receive a detailed diagnosis report."
    },
    {
      question: "Do I need to approve repair costs before work begins?",
      answer: "Yes, for non-warranty repairs, you'll receive a detailed quote after diagnosis. The quote includes itemized costs for parts and labor. You must approve the quote before repair work begins. Warranty repairs are covered at no cost to you."
    },
    
    // Warranty & Coverage
    {
      question: "What is covered under warranty?",
      answer: "Warranty coverage includes manufacturing defects and component failures under normal use conditions. Coverage period varies by product: Energizer Products (1-2 years), Power Adapters (1 year), Gate Motor Controllers (2 years). Physical damage, water damage, and misuse are not covered."
    },
    {
      question: "How do I know if my repair is covered under warranty?",
      answer: "During the diagnosis phase, our technicians will verify your warranty status using your serial number and purchase date. If covered, you'll be notified that no charges apply. If not covered, you'll receive a repair quote for approval."
    },
    {
      question: "What if my product is out of warranty?",
      answer: "Out-of-warranty repairs are still available at competitive rates. You'll receive a detailed quote after diagnosis and can choose to proceed with the repair or have your product returned unrepaired at no cost."
    },
    
    // Shipping & Logistics
    {
      question: "How do I send my product for repair?",
      answer: "After submitting your service request, you'll receive shipping instructions via email. We provide prepaid shipping labels for your convenience. Pack your product securely in the original packaging if available, or use adequate padding to prevent damage during transit."
    },
    {
      question: "Which service center will handle my repair?",
      answer: "You can choose from three service centers: Maharashtra (India), Gujarat (India), or Dubai (UAE). Select the one closest to your location for faster processing. Each center has certified technicians and maintains the same quality standards."
    },
    {
      question: "How will my repaired product be returned?",
      answer: "Your repaired product will be shipped back to your registered address using a reliable courier service. You'll receive a tracking number once dispatched. Delivery typically takes 2-5 business days depending on your location."
    },
    
    // Payment & Billing
    {
      question: "How do I pay for repairs?",
      answer: "Payment options include credit/debit cards, bank transfers, and digital wallets. You'll receive a secure payment link after approving your repair quote. Payment must be completed before repair work begins."
    },
    {
      question: "When do I pay for the repair?",
      answer: "Payment is required after you approve the repair quote and before work begins. For warranty repairs, no payment is required. You'll receive a payment link with secure processing options."
    },
    {
      question: "What if I'm not satisfied with the repair?",
      answer: "We offer a 90-day warranty on all repairs. If you experience issues with your repaired product, contact us immediately. We'll re-examine the product and make necessary adjustments at no additional cost."
    },
    
    // Technical Support
    {
      question: "Can I get technical support for my product?",
      answer: "Yes! Our technical support team can help with installation guidance, troubleshooting, and general product questions. Contact us through the chat widget or submit a support ticket from your dashboard."
    },
    {
      question: "What if my product can't be repaired?",
      answer: "If your product is beyond economical repair, we'll discuss replacement options. For warranty cases, we may offer a replacement unit. For out-of-warranty cases, we can recommend suitable replacement products at discounted rates."
    },
    {
      question: "Do you provide installation services?",
      answer: "Yes, we offer professional installation services for gate motor controllers and complex power systems. Installation services are available in select regions and can be arranged through your service request."
    },
    
    // Account & Profile
    {
      question: "How do I update my contact information?",
      answer: "Log into your account and go to your profile settings. You can update your email, phone number, and address. Make sure to keep this information current to receive important updates about your service requests."
    },
    {
      question: "Can I view my repair history?",
      answer: "Yes, your Customer Dashboard shows a complete history of all your service requests, including past repairs, current status, and repair details. This helps you track your product's service record."
    },
    {
      question: "How do I submit feedback about my service experience?",
      answer: "After your repair is completed, you'll receive an email with a feedback form. You can also submit feedback directly from your dashboard. Your feedback helps us improve our services."
    },
    
    // Troubleshooting
    {
      question: "My product stopped working suddenly. What should I do?",
      answer: "First, check basic connections and power supply. If the issue persists, submit a service request with detailed symptoms. Include when the problem started and any error messages or unusual behavior you've noticed."
    },
    {
      question: "Can I get a repair estimate before sending my product?",
      answer: "While we can provide general guidance, accurate repair estimates require physical examination of your product. Submit a service request and we'll provide a detailed quote after diagnosis at no cost to you."
    },
    {
      question: "What if I need urgent repair service?",
      answer: "We offer expedited repair services for urgent cases. Contact our support team through the chat widget or call our hotline. Expedited services may incur additional charges but ensure faster turnaround times."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Filter FAQs based on search term
  const filteredFAQs = faqData.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Frequently Asked Questions</h2>
        <button onClick={onBack} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">
            &larr; Back to Dashboard
        </button>
      </div>
      
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search FAQs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Results Count */}
      {searchTerm && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Found {filteredFAQs.length} result{filteredFAQs.length !== 1 ? 's' : ''} for "{searchTerm}"
        </div>
      )}

      <div className="space-y-4">
        {filteredFAQs.map((item, index) => (
          <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full flex justify-between items-center text-left py-2 focus:outline-none"
            >
              <span className="text-lg font-medium text-gray-900 dark:text-gray-100">{item.question}</span>
              <span className={`transform transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`}>
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96' : 'max-h-0'}`}>
              <p className="mt-2 text-gray-600 dark:text-gray-300 pr-6">
                {item.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;