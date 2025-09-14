import React, { useState, useContext } from 'react';
import { LanguageContext } from '../../contexts/LanguageContext';

interface FAQProps {
  onBack: () => void;
}

const FAQ: React.FC<FAQProps> = ({ onBack }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const languageContext = useContext(LanguageContext);

  if (!languageContext) {
    throw new Error('FAQ must be used within a LanguageProvider');
  }
  const { t } = languageContext;

  const faqData = t('faqData', { returnObjects: true }) as { question: string; answer: string }[];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{t('faqTitle')}</h2>
        <button onClick={onBack} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">
            &larr; {t('backToDashboard')}
        </button>
      </div>
      <div className="space-y-4">
        {faqData.map((item, index) => (
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