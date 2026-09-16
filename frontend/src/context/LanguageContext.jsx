import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Attempt to load from localStorage, otherwise default to English
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('language') || 'en';
    });

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    // Update language explicitly
    const changeLanguage = (lang) => {
        if (['en', 'hi', 'ta', 'mr', 'bn', 'te', 'kn', 'ml'].includes(lang)) {
            setLanguage(lang);
        }
    };

    // Cycle directly through the available languages
    const toggleLanguage = () => {
        setLanguage((prevLang) => {
            if (prevLang === 'en') return 'hi';
            if (prevLang === 'hi') return 'ta';
            return 'en';
        });
    };

    // Helper to fetch the translated string. Usage: t('feed')
    const t = (key) => {
        return translations[language][key] || translations['en'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
