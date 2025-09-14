import React, { createContext, useState, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  // FIX: Changed return type from 'string' to 'any' to allow returning objects for translations.
  t: (key: string, options?: any) => any;
}

const translations = {
  en: {
    logout: 'Logout',
    faqTitle: 'Frequently Asked Questions',
    backToDashboard: 'Back to Dashboard',
    languageToggle: 'العربية',
    darkModeToggle: 'Dark Mode',
    lightModeToggle: 'Light Mode',
    faqData: [
      {
        question: "How do I submit a new service request?",
        answer: "From your Customer Dashboard, click the 'Submit New Request' button and fill out the form with all the required details about your product and the issue you're facing."
      },
      {
        question: "How can I track the status of my repair?",
        answer: "You can see the real-time status of all your service requests on your Customer Dashboard. The status timeline in the request details view shows exactly which stage your repair is in."
      },
      {
        question: "How long does a typical repair take?",
        answer: "Repair times can vary depending on the complexity of the issue and parts availability. You will receive notifications as your device moves through the repair stages."
      }
    ]
  },
  ar: {
    logout: 'تسجيل الخروج',
    faqTitle: 'الأسئلة الشائعة',
    backToDashboard: 'العودة إلى لوحة التحكم',
    languageToggle: 'English',
    darkModeToggle: 'الوضع المظلم',
    lightModeToggle: 'الوضع المضيء',
    faqData: [
      {
        question: "كيف يمكنني تقديم طلب خدمة جديد؟",
        answer: "من لوحة تحكم العميل، انقر على زر 'تقديم طلب جديد' واملأ النموذج بجميع التفاصيل المطلوبة حول منتجك والمشكلة التي تواجهها."
      },
      {
        question: "كيف يمكنني تتبع حالة الإصلاح؟",
        answer: "يمكنك رؤية الحالة في الوقت الفعلي لجميع طلبات الخدمة الخاصة بك في لوحة تحكم العميل. يوضح الجدول الزمني للحالة في عرض تفاصيل الطلب بالضبط في أي مرحلة يكون إصلاحك."
      },
      {
        question: "كم من الوقت يستغرق الإصلاح النموذجي؟",
        answer: "يمكن أن تختلف أوقات الإصلاح اعتمادًا على تعقيد المشكلة وتوفر الأجزاء. ستتلقى إشعارات أثناء انتقال جهازك عبر مراحل الإصلاح."
      }
    ]
  }
};

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string, options?: any) => {
    const keys = key.split('.');
    let result: any = translations[language];
    for (const k of keys) {
      result = result?.[k];
    }
    
    if (options?.returnObjects && typeof result === 'object') {
        return result;
    }

    return result || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};