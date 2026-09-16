import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Newspaper, ChevronRight, Clock, ShieldCheck, Search, CalendarDays, RefreshCw, FolderOpen, AlertCircle, XCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import useReadHistory from '../hooks/useReadHistory'
import PolyglotLoader from '../components/PolyglotLoader'

export default function Feed() {
    const [articles, setArticles] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedGenre, setSelectedGenre] = useState('All')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [serverOffline, setServerOffline] = useState(false)
    const [uniqueGenres, setUniqueGenres] = useState(['All'])
    const [newCount, setNewCount] = useState(0)
    const latestIdsRef = useRef(new Set())
    const { user } = useAuth()
    const { t, language } = useLanguage()
    const { isRead, markRead } = useReadHistory()

    useEffect(() => {
        fetchArticles()
    }, [language, currentPage, searchQuery, selectedGenre])

    const fetchArticles = (silent = false) => {
        if (!silent) setLoading(true)
        setServerOffline(false)
        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')
        const limit = 12

        const queryParams = new URLSearchParams({ lang: language, page: currentPage, limit })
        if (searchQuery) queryParams.append('search', searchQuery)
        if (selectedGenre !== 'All') queryParams.append('genre', selectedGenre)

        fetch(`${baseUrl}/api/articles?${queryParams.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                const articlesData = data.articles || []
                if (silent) {
                    const incoming = new Set(articlesData.map(a => a.id))
                    const newOnes = [...incoming].filter(id => !latestIdsRef.current.has(id))
                    if (newOnes.length > 0) setNewCount(prev => prev + newOnes.length)
                    latestIdsRef.current = incoming
                } else {
                    setArticles(articlesData)
                    latestIdsRef.current = new Set(articlesData.map(a => a.id))
                    setTotalPages(data.pagination ? data.pagination.total_pages : 1)
                    setLoading(false)
                    setNewCount(0)
                    if (articlesData.length === 0 && currentPage === 1) setServerOffline(true)
                }
            })
            .catch(() => {
                if (!silent && currentPage === 1) setServerOffline(true)
                if (!silent) setLoading(false)
            })
    }
    // Fetch available genres on mount
    useEffect(() => {
        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')

        fetch(`${baseUrl}/api/genres`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.genres) {
                    setUniqueGenres(data.genres)
                }
            })
            .catch(err => console.error("Failed to fetch genres", err))
    }, [])
    // Reset page to 1 when search or genre changes
    useEffect(() => { setCurrentPage(1) }, [searchQuery, selectedGenre])

    // Debounced fetch on search/genre change
    useEffect(() => {
        const t = setTimeout(() => fetchArticles(), 300)
        return () => clearTimeout(t)
    }, [searchQuery, selectedGenre])

    // Auto-refresh: silent poll every 60s
    useEffect(() => {
        const interval = setInterval(() => fetchArticles(true), 60_000)
        return () => clearInterval(interval)
    }, [language, currentPage, searchQuery, selectedGenre])

    if (loading) {
        return <PolyglotLoader fullPage subtext="TYPESETTING TODAY'S EDITION" />
    }

    const loadNew = () => { setNewCount(0); fetchArticles() }

    return (
        <div className="space-y-6 max-w-5xl mx-auto transition-colors duration-300">

            {/* New articles banner */}
            <AnimatePresence>
                {newCount > 0 && (
                    <motion.button
                        initial={{ opacity: 0, y: -15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        onClick={loadNew}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-text-main text-bg-base text-sm font-bold uppercase tracking-widest hover:opacity-80 transition-all"
                    >
                        <RefreshCw size={14} />
                        {newCount} new article{newCount > 1 ? 's' : ''} — tap to load
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ═══ MASTHEAD SECTION ═══ */}
            <div className="text-center mb-2">
                <div className="byline flex items-center justify-center gap-2 mb-3">
                    <CalendarDays size={14} />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <h2 className="headline-xl mb-2">
                    {t('todaysNews')} {t('simplifiedNews')} {t('newsSuffix')}
                </h2>
                <div className="thick-rule max-w-xs mx-auto mt-3 mb-2"></div>
                <p className="text-sm text-text-muted font-medium max-w-xl mx-auto mt-3">
                    {t('realTimeDesc')}
                </p>
            </div>

            {/* ═══ SEARCH BAR ═══ */}
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center border border-border-main bg-bg-card">
                    <div className="pl-4 pr-2">
                        <Search className="h-4 w-4 text-text-muted" />
                    </div>
                    <input
                        type="text"
                        placeholder={t('searchArticles')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none text-sm font-medium text-text-main placeholder-text-muted focus:ring-0 outline-none px-2 py-3 font-sans"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="mr-3 p-1 text-text-muted hover:text-text-main transition-colors"
                        >
                            <XCircle size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* ═══ GENRE FILTERS ═══ */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-border-main pb-3">
                {uniqueGenres.map(genre => {
                    const isActive = selectedGenre === genre;
                    const translationKey = `genre_${genre.replace(/ /g, '')}`;
                    const displayGenre = t(translationKey) || genre;

                    return (
                        <button
                            key={genre}
                            onClick={() => setSelectedGenre(genre)}
                            className={`text-xs uppercase tracking-widest font-semibold py-1 transition-all border-b-2
                                ${isActive
                                    ? 'text-text-main border-text-main font-bold'
                                    : 'text-text-muted border-transparent hover:text-text-main hover:border-text-muted'
                                }`}
                        >
                            {displayGenre}
                        </button>
                    );
                })}
            </div>

            {/* Offline/Error State */}
            {serverOffline && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-border-main p-8 text-center bg-bg-card"
                >
                    <p className="text-text-main font-bold text-lg mb-4">
                        The news server is currently offline.
                    </p>
                    <button
                        onClick={fetchArticles}
                        className="inline-flex items-center gap-2 bg-text-main text-bg-base px-5 py-2 font-bold text-sm uppercase tracking-widest hover:opacity-80 transition-all"
                    >
                        <RefreshCw size={14} />
                        Retry Connection
                    </button>
                </motion.div>
            )}

            {/* ═══ ARTICLES — BROADSHEET GRID ═══ */}
            {!serverOffline && articles.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-border-main p-12 text-center bg-bg-card"
                >
                    <Search size={36} className="mx-auto text-text-muted mb-4" />
                    <h3 className="headline-lg text-text-main mb-2">No matches found</h3>
                    <p className="text-sm text-text-muted">{t('noArticlesMatch')}</p>
                </motion.div>
            ) : (
                <div className="space-y-0">
                    <AnimatePresence>
                        {articles.map((article, index) => {
                            const read = isRead(article.id)
                            const isLead = index === 0
                            return (
                                <motion.div
                                    key={article.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: read ? 0.5 : 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <Link to={`/article/${article.id}`} onClick={() => markRead(article.id)}>
                                        <div className={`group py-5 border-b border-border-main cursor-pointer transition-colors
                                            ${isLead ? 'pb-6' : ''}`}>

                                            {/* Metadata line */}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                                                {read && (
                                                    <span className="byline flex items-center gap-1">
                                                        <CheckCircle size={10} /> Read
                                                    </span>
                                                )}
                                                {article.is_available === false && (
                                                    <span className="byline flex items-center gap-1">
                                                        <AlertCircle size={10} /> {t('translationUnavailable')}
                                                    </span>
                                                )}
                                                <span className="byline font-bold">
                                                    {article.genre || 'General'}
                                                </span>
                                                <span className="byline">
                                                    {article.date}
                                                </span>
                                                <span className="byline flex items-center gap-1">
                                                    <Clock size={10} /> {article.read_time_min} {t('minRead')}
                                                </span>
                                                <span className="byline flex items-center gap-1">
                                                    <ShieldCheck size={10} /> {t('grade')} {article.readability_score.toFixed(1)}
                                                </span>
                                            </div>

                                            {/* Headline */}
                                            <h3 className={`${isLead ? 'headline-xl' : 'headline-lg'} text-text-main group-hover:underline transition-colors
                                                ${read ? 'text-text-muted' : ''}`}>
                                                {article.headline}
                                            </h3>
                                        </div>
                                    </Link>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* ═══ PAGINATION ═══ */}
            {!serverOffline && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8 py-4 border-t border-b border-border-main">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || loading}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all border border-border-main
                            ${currentPage === 1 || loading
                                ? 'opacity-40 cursor-not-allowed text-text-muted'
                                : 'text-text-main hover:bg-text-main hover:text-bg-base'
                            }`}
                    >
                        ← Previous
                    </button>
                    <span className="text-sm font-semibold text-text-main">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || loading}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all border border-border-main
                            ${currentPage === totalPages || loading
                                ? 'opacity-40 cursor-not-allowed text-text-muted'
                                : 'text-text-main hover:bg-text-main hover:text-bg-base'
                            }`}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    )
}
