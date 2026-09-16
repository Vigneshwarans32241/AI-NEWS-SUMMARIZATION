import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bookmark, BookmarkCheck, ChevronRight, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

import PolyglotLoader from '../components/PolyglotLoader'

export default function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState([])
    const [loading, setLoading] = useState(true)
    const { token } = useAuth()
    const { language, t } = useLanguage()

    useEffect(() => {
        const fetchBookmarks = async () => {
            setLoading(true)
            const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
            try {
                const res = await fetch(`${baseUrl}/api/bookmarks?lang=${language}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                setBookmarks(data.bookmarks || [])
            } catch (err) {
                console.error("Failed to fetch bookmarks", err)
            } finally {
                setLoading(false)
            }
        }
        if (token) fetchBookmarks()
    }, [token, language])

    const removeBookmark = async (id) => {
        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        await fetch(`${baseUrl}/api/bookmarks/${id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        setBookmarks(prev => prev.filter(b => b.id !== id))
    }

    if (loading) return (
        <PolyglotLoader fullPage text="RETRIEVING DISPATCHES" subtext="FETCHING BOOKMARKED ARTICLES" />
    )

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="text-center">
                <h2 className="headline-xl text-text-main mb-2">
                    {t('savedArticles')}
                </h2>
                <div className="thin-rule max-w-xs mx-auto my-2"></div>
                <p className="byline">
                    Articles saved in your reading list.
                </p>
            </div>

            {bookmarks.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-bg-card border border-border-main p-10 text-center text-text-muted"
                >
                    <Bookmark size={36} className="mx-auto text-text-muted mb-3" />
                    <h3 className="headline-md text-text-main mb-2">No saved articles yet</h3>
                    <p className="byline mb-4">Save articles from the feed to read them later.</p>
                    <Link to="/" className="inline-block px-5 py-2 bg-text-main text-bg-base text-xs font-bold uppercase tracking-widest hover:opacity-80 transition-all">
                        Browse Feed
                    </Link>
                </motion.div>
            ) : (
                <div className="space-y-0 border-t border-border-main">
                    {bookmarks.map((article, i) => (
                        <motion.div key={article.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.04 }}
                            className="group bg-bg-card p-4 border-b border-border-main hover:bg-bg-hover transition-colors flex items-center justify-between gap-4"
                        >
                            <Link to={`/article/${article.id}`} className="flex-1 min-w-0">
                                <div className="byline mb-1">
                                    {article.genre} • {article.read_time_min}m read • {article.date}
                                </div>
                                <h3 className="headline-md text-text-main group-hover:underline line-clamp-2" style={{ fontSize: '1.1rem' }}>
                                    {article.headline}
                                </h3>
                            </Link>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => removeBookmark(article.id)}
                                    className="p-2 border border-border-main text-text-muted hover:text-text-main hover:border-text-main transition-colors"
                                    title="Remove bookmark">
                                    <BookmarkCheck size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
