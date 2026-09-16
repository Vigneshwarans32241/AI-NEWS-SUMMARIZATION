import { Link, useLocation } from 'react-router-dom'
import { Home, Calendar, User, Globe, LogIn, LogOut, UserPlus, Sun, Moon, ChevronDown, Bookmark } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { useState, useRef, useEffect } from 'react'
import BreakingNewsSidebar, { TrendingSidebar } from './BreakingNewsSidebar'

const LANGUAGES = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'hi', label: 'हिंदी', short: 'HI' },
    { code: 'ta', label: 'தமிழ்', short: 'TA' },
    { code: 'mr', label: 'मराठी', short: 'MR' },
    { code: 'bn', label: 'বাংলা', short: 'BN' },
    { code: 'te', label: 'తెలుగు', short: 'TE' },
    { code: 'kn', label: 'ಕನ್ನಡ', short: 'KN' },
    { code: 'ml', label: 'മലയാളം', short: 'ML' },
]

export default function Layout({ children }) {
    const location = useLocation()
    const { user, logout } = useAuth()
    const { isDarkMode, toggleTheme } = useTheme()
    const { language, changeLanguage, t } = useLanguage()
    const [langOpen, setLangOpen] = useState(false)
    const langRef = useRef(null)

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    return (
        <div className="min-h-screen flex flex-col font-sans bg-bg-base text-text-main transition-colors duration-300">

            {/* ═══ TOP BAR: Utility Row ═══ */}
            <div className="w-full border-b border-border-main bg-bg-card">
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-between h-10">
                    {/* Left: Date */}
                    <span className="byline hidden sm:block">{todayStr}</span>

                    {/* Center: Edition */}
                    <span className="byline hidden md:block">AI Simplified News • Digital Edition</span>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-3 ml-auto sm:ml-0">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center p-1.5 text-text-muted hover:text-text-main transition-colors"
                            title="Toggle Theme"
                        >
                            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                        </button>

                        {/* Language Dropdown */}
                        <div ref={langRef} className="relative">
                            <button
                                onClick={() => setLangOpen(o => !o)}
                                className="flex items-center gap-1.5 px-2 py-1 text-text-muted hover:text-text-main transition-colors"
                            >
                                <Globe size={13} />
                                <span className="byline">{currentLang.short}</span>
                                <ChevronDown size={12} className={`transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {langOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        transition={{ duration: 0.12 }}
                                        className="absolute right-0 mt-1 w-40 bg-bg-card border border-border-main shadow-lg overflow-hidden z-50"
                                    >
                                        {LANGUAGES.map(lang => (
                                            <button
                                                key={lang.code}
                                                onClick={() => { changeLanguage(lang.code); setLangOpen(false) }}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${language === lang.code
                                                    ? 'bg-bg-hover font-bold text-text-main'
                                                    : 'text-text-muted hover:bg-bg-hover hover:text-text-main'
                                                    }`}
                                            >
                                                <span className="byline w-5">{lang.short}</span>
                                                {lang.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-4 bg-border-main"></div>

                        {user ? (
                            <div className="flex items-center gap-2">
                                <span className="byline hidden sm:inline">{user.username}</span>
                                <button onClick={logout} className="p-1.5 text-text-muted hover:text-text-main transition-colors" title="Logout">
                                    <LogOut size={15} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link to="/login" className="byline text-text-muted hover:text-text-main transition-colors">
                                    {t('logIn')}
                                </Link>
                                <span className="text-text-muted">•</span>
                                <Link to="/signup" className="byline text-text-main font-bold hover:underline transition-colors">
                                    {t('signUp')}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ MASTHEAD ═══ */}
            <header className="w-full bg-bg-card">
                <div className="masthead-rule"></div>
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 sm:py-6 text-center">
                    <Link to="/" className="inline-block">
                        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-text-main leading-none">
                            The Daily Dispatch
                        </h1>
                    </Link>
                    <p className="byline mt-2">Simplified • Verified • Accessible</p>
                </div>
                <div className="masthead-rule"></div>

                {/* ─── Navigation ─── */}
                {user && (
                    <nav className="hidden md:block border-b border-border-main bg-bg-card">
                        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-center gap-8 py-2.5">
                            <NavLink to="/" label={t('feed')} icon={<Home size={14} />} active={location.pathname === '/'} />
                            <span className="text-text-muted text-xs">•</span>
                            <NavLink to="/archive" label={t('archive')} icon={<Calendar size={14} />} active={location.pathname === '/archive'} />
                            <span className="text-text-muted text-xs">•</span>
                            <NavLink to="/progress" label={t('progress')} icon={<User size={14} />} active={location.pathname === '/progress'} />
                            <span className="text-text-muted text-xs">•</span>
                            <NavLink to="/bookmarks" label={t('saved')} icon={<Bookmark size={14} />} active={location.pathname === '/bookmarks'} />
                        </div>
                    </nav>
                )}
            </header>

            {/* ═══ BREAKING NEWS TICKER ═══ */}
            {user && <NewsTicker />}

            {/* Mobile Nav */}
            {user && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border-main pb-safe transition-colors duration-300">
                    <nav className="flex items-center justify-around p-3 h-14">
                        <Link to="/" className={`flex flex-col items-center gap-0.5 ${location.pathname === '/' ? 'text-text-main font-bold' : 'text-text-muted'}`}>
                            <Home size={18} />
                            <span className="text-[9px] uppercase tracking-wider font-semibold">{t('feed')}</span>
                        </Link>
                        <Link to="/archive" className={`flex flex-col items-center gap-0.5 ${location.pathname === '/archive' ? 'text-text-main font-bold' : 'text-text-muted'}`}>
                            <Calendar size={18} />
                            <span className="text-[9px] uppercase tracking-wider font-semibold">{t('archive')}</span>
                        </Link>
                        <Link to="/progress" className={`flex flex-col items-center gap-0.5 ${location.pathname === '/progress' ? 'text-text-main font-bold' : 'text-text-muted'}`}>
                            <User size={18} />
                            <span className="text-[9px] uppercase tracking-wider font-semibold">{t('progress')}</span>
                        </Link>
                        <Link to="/bookmarks" className={`flex flex-col items-center gap-0.5 ${location.pathname === '/bookmarks' ? 'text-text-main font-bold' : 'text-text-muted'}`}>
                            <Bookmark size={18} />
                            <span className="text-[9px] uppercase tracking-wider font-semibold">{t('saved')}</span>
                        </Link>
                    </nav>
                </div>
            )}
            {/* ═══ 3-Column Layout (Pushed to Farthest Left & Right) ═══ */}
            <div className="flex-1 w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-14 py-8 pb-24 md:pb-8 relative z-10 xl:grid xl:grid-cols-[240px_1fr_240px] 2xl:grid-cols-[280px_1fr_280px] xl:gap-8 2xl:gap-12 xl:items-start">

                {/* Left: Latest / Breaking News (Farthest Left) */}
                <div className="xl:sticky xl:top-4 col-divider xl:pr-6 w-full">
                    <BreakingNewsSidebar />
                </div>

                {/* Center: Main Page Content */}
                <main className="min-w-0 w-full max-w-[1100px] mx-auto xl:px-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* Right: Trending (Farthest Right) */}
                <div className="xl:sticky xl:top-4 xl:pl-6 w-full" style={{ borderLeft: '1px solid var(--theme-border-main)' }}>
                    <TrendingSidebar />
                </div>
            </div>

            {/* ═══ FOOTER ═══ */}
            <footer className="border-t border-border-main py-8 mt-auto relative z-10 hidden md:block transition-colors duration-300 bg-bg-card">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-14 text-center">
                    <div className="thick-rule mb-4"></div>
                    <p className="byline">© {new Date().getFullYear()} The Daily Dispatch — ClearNews Initiative</p>
                    <p className="byline mt-1 opacity-60">Simplified, verified, and accessible public information.</p>
                </div>
            </footer>
        </div>
    )
}

/* ─── Nav Link Component ─── */
function NavLink({ to, label, icon, active }) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest transition-colors py-1 border-b-2 ${active
                ? 'text-text-main border-text-main'
                : 'text-text-muted border-transparent hover:text-text-main hover:border-text-muted'
                }`}
        >
            {icon}
            <span>{label}</span>
        </Link>
    )
}

/* ─── Breaking News Ticker ─── */
function NewsTicker() {
    const { language } = useLanguage()
    const { user } = useAuth()
    const [headlines, setHeadlines] = useState([])

    useEffect(() => {
        if (!user) return
        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')
        fetch(`${baseUrl}/api/articles?limit=8&lang=${language}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(d => setHeadlines((d.articles || []).map(a => a.headline)))
            .catch(() => { })
    }, [language, user])

    if (!headlines.length) return null

    const tickerText = headlines.join('  ◆  ')

    return (
        <div className="ticker-wrap">
            <div className="max-w-[1200px] mx-auto flex items-center">
                <span className="shrink-0 bg-text-main text-bg-base px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
                    Breaking
                </span>
                <div className="overflow-hidden flex-1">
                    <div className="ticker-move py-1.5 px-4">
                        <span className="text-sm font-medium text-text-main">
                            {tickerText}  ◆  {tickerText}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
