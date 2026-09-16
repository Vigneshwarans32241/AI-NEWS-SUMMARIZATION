import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ChevronRight, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

export default function BreakingNewsSidebar() {
    const [articles, setArticles] = useState([])
    const { language } = useLanguage()
    const { user } = useAuth()

    useEffect(() => {
        if (!user) return
        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')
        fetch(`${baseUrl}/api/articles?limit=6&lang=${language}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(d => setArticles(d.articles || []))
            .catch(() => { })
    }, [language, user])

    if (!articles.length) return null

    return (
        <aside className="hidden xl:flex flex-col w-full">
            {/* Section Header */}
            <div className="section-header flex items-center gap-2">
                <Zap size={12} />
                <span>Latest</span>
            </div>

            <div className="flex flex-col">
                {articles.slice(0, 5).map((article, i) => (
                    <motion.div
                        key={article.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                    >
                        <Link to={`/article/${article.id}`}>
                            <div className="group py-3 border-b border-border-subtle cursor-pointer">
                                <span className="byline block mb-1">
                                    {article.genre || 'News'} • {article.date}
                                </span>
                                <p className="headline-sm text-text-main leading-snug group-hover:underline transition-colors" style={{ fontSize: '0.85rem' }}>
                                    {article.headline}
                                </p>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </aside>
    )
}

export function TrendingSidebar() {
    const [articles, setArticles] = useState([])
    const [activeIndex, setActiveIndex] = useState(0)
    const { language } = useLanguage()
    const { user } = useAuth()

    useEffect(() => {
        if (!user) return
        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')
        fetch(`${baseUrl}/api/articles?limit=10&lang=${language}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(d => setArticles((d.articles || []).slice(5)))
            .catch(() => { })
    }, [language, user])

    // Auto-cycle through articles
    useEffect(() => {
        if (!articles.length) return
        const t = setInterval(() => setActiveIndex(i => (i + 1) % articles.length), 3000)
        return () => clearInterval(t)
    }, [articles.length])

    if (!articles.length) return null

    return (
        <aside className="hidden xl:flex flex-col w-full">
            {/* Section Header */}
            <div className="section-header flex items-center gap-2">
                <TrendingUp size={12} />
                <span>Trending</span>
            </div>

            {/* Featured rotating article */}
            <div className="relative border-b border-border-main pb-3 mb-3 min-h-[70px]">
                <AnimatePresence mode="wait">
                    {articles[activeIndex] && (
                        <motion.div
                            key={articles[activeIndex].id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Link to={`/article/${articles[activeIndex].id}`}>
                                <span className="byline block mb-1">
                                    {articles[activeIndex].genre || 'News'}
                                </span>
                                <p className="headline-sm text-text-main leading-snug hover:underline" style={{ fontSize: '0.85rem' }}>
                                    {articles[activeIndex].headline}
                                </p>
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Numbered list */}
            <div className="flex flex-col">
                {articles.map((article, i) => (
                    <Link key={article.id} to={`/article/${article.id}`}>
                        <div className={`flex items-start gap-2 py-2 border-b border-border-subtle cursor-pointer group transition-colors
                            ${i === activeIndex ? 'bg-bg-hover' : ''}`}>
                            <span className={`text-xs font-black w-5 shrink-0 text-center mt-0.5
                                ${i === activeIndex ? 'text-text-main' : 'text-text-muted'}`}>
                                {i + 1}
                            </span>
                            <p className={`text-xs font-medium leading-snug group-hover:underline
                                ${i === activeIndex ? 'text-text-main font-semibold' : 'text-text-muted'}`}>
                                {article.headline}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </aside>
    )
}
