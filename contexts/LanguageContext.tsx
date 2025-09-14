import React, { createContext, useState, ReactNode } from 'react';

type Language = 'en' | 'es';

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
  es: {
    logout: 'Cerrar sesión',
    faqTitle: 'Preguntas Frecuentes',
    backToDashboard: 'Volver al Panel',
    faqData: [
        {
            question: "¿Cómo envío una nueva solicitud de servicio?",
            answer: "Desde su Panel de Cliente, haga clic en el botón 'Enviar Nueva Solicitud' y complete el formulario con todos los detalles requeridos sobre su producto y el problema que enfrenta."
        },
        {
            question: "¿Cómo puedo rastrear el estado de mi reparación?",
            answer: "Puede ver el estado en tiempo real de todas sus solicitudes de servicio en su Panel de Cliente. La línea de tiempo de estado en la vista de detalles de la solicitud muestra exactamente en qué etapa se encuentra su reparación."
        },
        {
            question: "¿Cuánto tiempo toma una reparación típica?",
            answer: "Los tiempos de reparación pueden variar según la complejidad del problema y la disponibilidad de piezas. Recibirá notificaciones a medida que su dispositivo avance por las etapas de reparación."
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