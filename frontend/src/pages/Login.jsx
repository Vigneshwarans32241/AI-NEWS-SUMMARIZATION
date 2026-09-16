import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FiMail, FiLock, FiAlertCircle, FiArrowRight } from 'react-icons/fi';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, loginAsGuest } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center p-4 h-full">
            <div className="max-w-md w-full bg-bg-card border border-border-main p-8 sm:p-10 transition-colors duration-300">

                <div className="text-center mb-8">
                    <h2 className="headline-xl text-text-main mb-2">{t('welcomeBack')}</h2>
                    <div className="thin-rule my-3"></div>
                    <p className="byline">{t('signInToContinue')}</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 border border-text-main bg-bg-hover flex items-start space-x-3">
                        <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-text-main" />
                        <span className="text-sm text-text-main">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label className="byline ml-0.5">{t('emailAddress')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                                <FiMail className="w-4 h-4" />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-bg-base border border-border-main text-text-main placeholder-text-muted py-3 pl-10 pr-4 focus:outline-none focus:border-text-main transition-all font-sans text-sm"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="byline ml-0.5">{t('password')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                                <FiLock className="w-4 h-4" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-bg-base border border-border-main text-text-main placeholder-text-muted py-3 pl-10 pr-4 focus:outline-none focus:border-text-main transition-all font-sans text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-text-main text-bg-base font-bold text-sm uppercase tracking-widest hover:opacity-80 transition-all flex items-center justify-center group disabled:opacity-50"
                    >
                        {loading ? 'Authenticating...' : (
                            <>
                                {t('signIn')}
                                <FiArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => { loginAsGuest(); navigate('/'); }}
                        className="w-full py-2.5 px-4 border border-border-main text-text-muted hover:text-text-main text-xs font-bold uppercase tracking-wider hover:bg-bg-hover transition-colors"
                    >
                        Preview as Guest (Demo Mode)
                    </button>
                </form>

                <div className="thin-rule my-6"></div>

                <p className="text-center text-sm text-text-muted">
                    {t('dontHaveAccount')}{' '}
                    <Link to="/signup" className="text-text-main font-bold underline hover:no-underline transition-colors">
                        {t('signUphref')}
                    </Link>
                </p>
            </div>
        </div>
    );
};
