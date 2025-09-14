import React, { useContext } from 'react';
import { AppUser } from '../../types';
import { LanguageContext } from '../../contexts/LanguageContext';

interface HeaderProps {
  user: AppUser | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const languageContext = useContext(LanguageContext);
  if (!languageContext) {
    throw new Error('Header must be used within a LanguageProvider');
  }
  const { language, setLanguage, t } = languageContext;

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 6V3m0 18v-3m6-9h3m-3 6h3M6 9H3m3 6H3" />
                </svg>
            </div>
            <div className="ml-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Service Hub Pro</h1>
            </div>
          </div>
          <div className="flex items-center">
            <button onClick={toggleLanguage} className="mr-4 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              {language === 'en' ? 'Español' : 'English'}
            </button>
            {user && (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{user.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;