import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { AppUser } from '../../types';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

interface ChatWidgetProps {
    user: AppUser;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'bot', 
      text: "Hello! I'm your A-1 Fence Services assistant. I can help you with:\n• Check repair status\n• Submit new requests\n• Answer questions about our services\n• Provide technical support\n• Help with warranty information\n\nHow can I assist you today?" 
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  // Load user's service requests when component mounts
  useEffect(() => {
    const loadUserRequests = async () => {
      try {
        if (user.role === 'customer') {
          console.log('ChatWidget: Loading requests for customer:', user.email, 'with ID:', user.id);
          const requests = await api.getServiceRequestsForCustomer(user.id);
          
          // Additional validation for customers
          const validRequests = requests.filter(req => req.customer_id === user.id);
          if (validRequests.length !== requests.length) {
            console.error('SECURITY WARNING: ChatWidget received invalid requests for customer');
          }
          setUserRequests(validRequests);
        } else {
          const requests = await api.getServiceRequests();
          setUserRequests(requests);
        }
      } catch (error) {
        console.error('Failed to load user requests:', error);
      }
    };
    
    if (isOpen) {
      loadUserRequests();
    }
  }, [isOpen, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() === '') return;

    const newUserMessage: Message = { sender: 'user', text: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    const currentInput = userInput;
    setUserInput('');
    setIsTyping(true);
    
    // Enhanced Bot logic
    setTimeout(async () => {
        let botResponseText = await generateBotResponse(currentInput, user, userRequests);
        const newBotMessage: Message = { sender: 'bot', text: botResponseText };
        setMessages(prev => [...prev, newBotMessage]);
        setIsTyping(false);
    }, 1200);
  };

  const generateBotResponse = async (input: string, user: AppUser, requests: any[]): Promise<string> => {
    const lowerCaseInput = input.toLowerCase().trim();
    
    // Greeting responses
    if (lowerCaseInput.includes('hello') || lowerCaseInput.includes('hi') || lowerCaseInput.includes('hey')) {
      return `Hello ${user.fullName || user.email}! I'm here to help you with your A-1 Fence Services needs. What can I assist you with today?`;
    }
    
    // Status check - multiple formats
    if (lowerCaseInput.includes('status') || lowerCaseInput.includes('check') || lowerCaseInput.includes('track')) {
      // Try to extract request ID
      const requestIdMatch = input.match(/(?:req-)?[a-zA-Z0-9-_]+/);
      if (requestIdMatch) {
        const requestId = requestIdMatch[0];
        try {
          const request = await api.getServiceRequestById(requestId);
          if (request && (user.role === 'customer' ? request.customer_id === user.id : true)) {
            const statusEmoji = getStatusEmoji(request.status);
            return `${statusEmoji} **Request ${requestId}**\n\n**Status:** ${request.status}\n**Product:** ${request.product_type}\n**Created:** ${new Date(request.created_at).toLocaleDateString()}\n\n${getStatusDescription(request.status)}`;
          } else {
            return "❌ Sorry, I couldn't find a request with that ID associated with your account.";
          }
        } catch (error) {
          return "❌ Sorry, I couldn't find a request with that ID. Please check the ID and try again.";
        }
      } else {
        // Show all user's requests
        if (requests.length > 0) {
          let response = "📋 **Your Service Requests:**\n\n";
          requests.slice(0, 5).forEach((req, index) => {
            const statusEmoji = getStatusEmoji(req.status);
            response += `${index + 1}. ${statusEmoji} **${req.id}** - ${req.status}\n   Product: ${req.product_type}\n   Created: ${new Date(req.created_at).toLocaleDateString()}\n\n`;
          });
          if (requests.length > 5) {
            response += `... and ${requests.length - 5} more requests.`;
          }
          response += "\n💡 To get detailed status, type: 'status [request-id]'";
          return response;
        } else {
          return "📭 You don't have any service requests yet. Would you like help submitting a new request?";
        }
      }
    }
    
    // New request help
    if (lowerCaseInput.includes('new request') || lowerCaseInput.includes('submit') || lowerCaseInput.includes('create')) {
      return "🆕 **To submit a new service request:**\n\n1. Go to your Customer Dashboard\n2. Click 'Submit New Request'\n3. Fill out the form with:\n   • Product details and serial number\n   • Problem description\n   • Your address\n   • Preferred service center\n   • Photos of the issue\n\n💡 **Tip:** Use the QR scanner to quickly capture your serial number!";
    }
    
    // Warranty questions
    if (lowerCaseInput.includes('warranty') || lowerCaseInput.includes('covered')) {
      return "🛡️ **Warranty Coverage:**\n\n• **Energizer Products:** 1-2 years\n• **Power Adapters:** 1 year\n• **Gate Motor Controllers:** 2 years\n\n✅ **Covered:** Manufacturing defects, component failures\n❌ **Not Covered:** Physical damage, water damage, misuse\n\n💡 Warranty status is verified during diagnosis. No charges for warranty repairs!";
    }
    
    // Repair time questions
    if (lowerCaseInput.includes('how long') || lowerCaseInput.includes('time') || lowerCaseInput.includes('duration')) {
      return "⏱️ **Repair Timeframes:**\n\n• **Simple repairs:** 1-3 business days\n• **Moderate repairs:** 3-7 business days\n• **Complex repairs:** 7-14 business days\n\n📧 You'll receive email notifications at each stage:\nReceived → Diagnosis → Awaiting Approval → Repair → Quality Check → Dispatched → Completed";
    }
    
    // Service centers
    if (lowerCaseInput.includes('service center') || lowerCaseInput.includes('location') || lowerCaseInput.includes('where')) {
      return "🏢 **Our Service Centers:**\n\n• **Maharashtra, India** - Central processing\n• **Gujarat, India** - Western region\n• **Dubai, UAE** - Middle East operations\n\n🌍 Choose the center closest to you for faster processing. All centers maintain the same quality standards!";
    }
    
    // Payment questions
    if (lowerCaseInput.includes('payment') || lowerCaseInput.includes('cost') || lowerCaseInput.includes('price') || lowerCaseInput.includes('charge')) {
      return "💳 **Payment Information:**\n\n• **Warranty repairs:** FREE\n• **Out-of-warranty:** Quote provided after diagnosis\n• **Payment methods:** Credit/Debit cards, Bank transfer, Digital wallets\n• **When to pay:** After approving the quote, before repair begins\n\n💰 We offer competitive rates and 90-day warranty on all repairs!";
    }
    
    // Technical support
    if (lowerCaseInput.includes('technical') || lowerCaseInput.includes('help') || lowerCaseInput.includes('support') || lowerCaseInput.includes('troubleshoot')) {
      return "🔧 **Technical Support:**\n\nI can help with:\n• Product troubleshooting\n• Installation guidance\n• General product questions\n• Service request assistance\n\n📞 For urgent issues, contact our support team directly.\n💬 Describe your specific problem and I'll do my best to help!";
    }
    
    // Contact information
    if (lowerCaseInput.includes('contact') || lowerCaseInput.includes('phone') || lowerCaseInput.includes('email') || lowerCaseInput.includes('reach')) {
      return "📞 **Contact Information:**\n\n• **Chat Support:** Available 24/7 (this chat)\n• **Email:** support@a1fenceservices.com\n• **Phone:** +1-800-A1-FENCE\n• **Hours:** Mon-Fri 8AM-6PM, Sat 9AM-4PM\n\n💬 I'm here to help right now! What's your question?";
    }
    
    // FAQ reference
    if (lowerCaseInput.includes('faq') || lowerCaseInput.includes('questions') || lowerCaseInput.includes('common')) {
      return "❓ **Frequently Asked Questions:**\n\nI can answer questions about:\n• Service request process\n• Warranty coverage\n• Repair timelines\n• Payment options\n• Technical support\n• Service centers\n\n💡 Try asking: 'How do I submit a request?' or 'What's covered under warranty?'";
    }
    
    // Thank you responses
    if (lowerCaseInput.includes('thank') || lowerCaseInput.includes('thanks')) {
      return "😊 You're very welcome! I'm here whenever you need help with A-1 Fence Services. Is there anything else I can assist you with?";
    }
    
    // Default response with helpful suggestions
    return `🤔 I'm not sure I understand that question. Here's how I can help:\n\n• **Check status:** "status [request-id]" or just "status"\n• **New request:** "How do I submit a new request?"\n• **Warranty:** "What's covered under warranty?"\n• **Timeline:** "How long does repair take?"\n• **Support:** "I need technical help"\n\n💬 Try rephrasing your question or ask about one of these topics!`;
  };

  const getStatusEmoji = (status: string): string => {
    const statusEmojis: { [key: string]: string } = {
      'Received': '📥',
      'Diagnosis': '🔍',
      'Awaiting Approval': '⏳',
      'Repair in Progress': '🔧',
      'Quality Check': '✅',
      'Dispatched': '📦',
      'Completed': '🎉',
      'Cancelled': '❌'
    };
    return statusEmojis[status] || '📋';
  };

  const getStatusDescription = (status: string): string => {
    const descriptions: { [key: string]: string } = {
      'Received': 'Your request has been submitted and logged in our system.',
      'Diagnosis': 'Our technicians are examining your product to identify the issue.',
      'Awaiting Approval': 'A repair quote is being prepared for your approval.',
      'Repair in Progress': 'Your product is being repaired by our certified technicians.',
      'Quality Check': 'Final testing and quality assurance is being performed.',
      'Dispatched': 'Your repaired product is being shipped back to you.',
      'Completed': 'Your product has been delivered and the case is closed.',
      'Cancelled': 'This request has been cancelled.'
    };
    return descriptions[status] || 'Status update available.';
  };

  return (
    <>
      <div className={`fixed bottom-5 right-5 transition-all duration-300 ${isOpen ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label="Open chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        </button>
      </div>

      <div className={`fixed bottom-5 right-5 w-80 h-[28rem] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
        <div className="bg-primary-600 p-3 flex justify-between items-center text-white rounded-t-lg">
          <h3 className="font-semibold">Chat Support</h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setMessages([{ sender: 'bot', text: "Hello! I'm your A-1 Fence Services assistant. How can I help you today?" }])}
              className="text-xs px-2 py-1 bg-primary-500 hover:bg-primary-400 rounded transition-colors"
              title="Clear chat"
            >
              Clear
            </button>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat">&times;</button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
              <div className={`rounded-lg py-2 px-3 max-w-[80%] ${msg.sender === 'user' ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                <div className="whitespace-pre-line">
                  {msg.text.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                  )}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex justify-start mb-3">
                 <div className="rounded-lg py-2 px-3 max-w-[80%] bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    <span className="animate-pulse">...</span>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Quick Action Buttons */}
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => setUserInput('status')}
              className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
            >
              Check Status
            </button>
            <button
              onClick={() => setUserInput('How do I submit a new request?')}
              className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
            >
              New Request
            </button>
            <button
              onClick={() => setUserInput('What is covered under warranty?')}
              className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
            >
              Warranty
            </button>
            <button
              onClick={() => setUserInput('How long does repair take?')}
              className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
            >
              Repair Time
            </button>
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </form>
      </div>
    </>
  );
};

export default ChatWidget;