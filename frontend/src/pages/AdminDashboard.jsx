import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, BarChart3, AlertCircle, FileText, Activity, ShieldCheck, Clock, BookOpen, CheckCircle, Target } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function AdminDashboard() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const { language, t } = useLanguage()

    const fetchStats = () => {
        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')

        fetch(`${baseUrl}/api/user/stats?lang=${language}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setStats(data)
                setLoading(false)
            })
            .catch(err => {
                console.error("Failed to fetch admin stats", err)
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchStats()
    }, [language])

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-8 w-8 border-2 border-text-main border-t-transparent"></div>
            </div>
        )
    }

    const formatDate = (isoString) => {
        if (!isoString || isoString === "Now") return "Just now"
        const date = new Date(isoString)
        if (isNaN(date.getTime())) return "Recently"
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
    }

    return (
        <div className="space-y-8 transition-colors duration-300">
            <Link to="/" className="inline-flex items-center gap-2 byline text-text-muted hover:text-text-main transition-colors">
                <ArrowLeft size={14} /> {t('backToPlatform')}
            </Link>

            <div className="text-center sm:text-left">
                <h2 className="headline-xl text-text-main mb-2 flex items-center justify-center sm:justify-start gap-3">
                    <Activity className="text-text-main" size={28} /> {t('yourProgress')}
                </h2>
                <div className="thin-rule max-w-xs my-2 sm:mx-0 mx-auto"></div>
                <p className="byline text-text-muted max-w-2xl">
                    {t('trackHistory')}
                </p>
            </div>

            {/* Top Level Aggregate Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={<FileText size={18} />}
                    label={t('articlesRead')}
                    value={stats?.articles_read || 0}
                />
                <MetricCard
                    icon={<ShieldCheck size={18} />}
                    label={t('platformArticles')}
                    value={`${stats?.global_total_articles || 0}`}
                />
                <MetricCard
                    icon={<BarChart3 size={18} />}
                    label={t('avgQuizScore')}
                    value={`${stats?.avg_score || 0}%`}
                />
                <MetricCard
                    icon={<AlertCircle size={18} />}
                    label={t('avgReadingLevel')}
                    value={`${t('grade')} ${stats?.avg_readability || 0}`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Left Column: Reading History */}
                <div className="bg-bg-card border border-border-main p-5 sm:p-6 transition-colors duration-300">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-border-main">
                        <BookOpen className="text-text-main" size={18} />
                        <h3 className="headline-md text-text-main">{t('readingHistory')}</h3>
                    </div>

                    {!stats?.reading_history || stats.reading_history.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border-main p-4">
                            <BookOpen size={32} className="mx-auto text-text-muted opacity-50 mb-2" />
                            <p className="byline font-bold">{t('noArticlesRead')}</p>
                            <p className="byline text-text-muted mt-1">{t('startExploring')}</p>
                        </div>
                    ) : (
                        <div className="space-y-0 border-t border-border-main">
                            {stats.reading_history.map((item, index) => (
                                <div key={`read-${index}`} className="group py-3 border-b border-border-main">
                                    <Link to={`/article/${item.article_id}`} className="block">
                                        <h4 className="headline-sm text-text-main group-hover:underline line-clamp-1 mb-1" style={{ fontSize: '0.9rem' }}>
                                            {item.headline || 'Unknown Article'}
                                        </h4>
                                        <div className="byline">
                                            {formatDate(item.date)}
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Quiz Ledger */}
                <div className="bg-bg-card border border-border-main p-5 sm:p-6 transition-colors duration-300">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-border-main">
                        <Target className="text-text-main" size={18} />
                        <h3 className="headline-md text-text-main">{t('quizLedger')}</h3>
                    </div>

                    {!stats?.quiz_history || stats.quiz_history.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border-main p-4">
                            <CheckCircle size={32} className="mx-auto text-text-muted opacity-50 mb-2" />
                            <p className="byline font-bold">{t('noQuizzesTaken')}</p>
                            <p className="byline text-text-muted mt-1">{t('testComprehensionAtEnd')}</p>
                        </div>
                    ) : (
                        <div className="space-y-0 border-t border-border-main">
                            {stats.quiz_history.map((quiz, index) => (
                                <div key={`quiz-${index}`} className="group py-3 border-b border-border-main flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="byline mb-0.5">
                                            {formatDate(quiz.date)}
                                        </div>
                                        <Link to={`/article/${quiz.article_id}`} className="block">
                                            <h4 className="headline-sm text-text-main group-hover:underline line-clamp-1" style={{ fontSize: '0.9rem' }}>
                                                {quiz.headline || 'Unknown Article'}
                                            </h4>
                                        </Link>
                                    </div>

                                    <div className="shrink-0">
                                        <span className="byline font-bold">
                                            {quiz.score}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function MetricCard({ label, value, icon }) {
    return (
        <div className="bg-bg-card border border-border-main p-5">
            <div className="flex items-center justify-between mb-2">
                <span className="byline">{label}</span>
                <span className="text-text-muted">{icon}</span>
            </div>
            <p className="text-3xl font-black text-text-main font-serif tracking-tight">{value}</p>
        </div>
    )
}
