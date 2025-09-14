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
    { sender: 'bot', text: "Hello! How can I help you? You can ask for the status of a repair by typing 'status [your request ID]'." },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() === '') return;

    const newUserMessage: Message = { sender: 'user', text: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsTyping(true);
    
    // Bot logic
    setTimeout(async () => {
        let botResponseText = "I'm not sure how to help with that. Try asking 'status [request ID]'.";
        const lowerCaseInput = userInput.toLowerCase();

        if(lowerCaseInput.startsWith('status')) {
            const parts = userInput.split(' ');
            if (parts.length > 1 && parts[1]) {
                const requestId = parts[1];
                 try {
                    const request = await api.getServiceRequestById(requestId);
                    if (request && request.customer_id === user.id) {
                        botResponseText = `The status for request ...${requestId.slice(-8)} is: ${request.status}.`;
                    } else {
                        botResponseText = "Sorry, I couldn't find a request with that ID associated with your account.";
                    }
                } catch (error) {
                    botResponseText = "Sorry, I couldn't find a request with that ID.";
                }
            } else {
                 botResponseText = "Please provide a request ID after 'status', for example: 'status abc-123'";
            }
        } else if(lowerCaseInput.includes('hello') || lowerCaseInput.includes('hi')) {
            botResponseText = "Hello there! How may I assist you today?";
        }
      const newBotMessage: Message = { sender: 'bot', text: botResponseText };
      setMessages(prev => [...prev, newBotMessage]);
      setIsTyping(false);
    }, 1200);

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
          <button onClick={() => setIsOpen(false)} aria-label="Close chat">&times;</button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
              <div className={`rounded-lg py-2 px-3 max-w-[80%] ${msg.sender === 'user' ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                {msg.text}
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