import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronRight, Clock, CalendarSearch, XCircle, ChevronLeft } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import PolyglotLoader from '../components/PolyglotLoader'

export default function ArchivePage() {
    const { t, language } = useLanguage()
    const [articles, setArticles] = useState([])
    const [loading, setLoading] = useState(false)
    const [fetchedDate, setFetchedDate] = useState('')
    const [searchDate, setSearchDate] = useState('')
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const fetchByDate = (date, lang) => {
        setLoading(true)
        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')
        const url = date 
            ? `${baseUrl}/api/articles/by-date?date=${date}&lang=${lang || language}`
            : `${baseUrl}/api/articles?limit=50&lang=${lang || language}`

        fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setArticles(data.articles || [])
                setFetchedDate(date || 'All Archived')
                setLoading(false)
            })
            .catch(err => {
                console.error('Failed to fetch archive articles', err)
                setLoading(false)
            })
    }

    // Load archive articles on mount and whenever searchDate or language changes
    useEffect(() => {
        fetchByDate(searchDate, language)
    }, [searchDate, language])

    const filteredArticles = articles
    const groupedArticles = filteredArticles.reduce((acc, article) => {
        const date = article.date || 'Unknown Date'
        if (!acc[date]) acc[date] = []
        acc[date].push(article)
        return acc
    }, {})
    const sortedDates = Object.keys(groupedArticles).sort((a, b) => new Date(b) - new Date(a))

    // Helper functions for custom calendar widget
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    }
    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    }
    const handleSelectDate = (day) => {
        const year = currentMonth.getFullYear()
        const month = String(currentMonth.getMonth() + 1).padStart(2, '0')
        const dayStr = String(day).padStart(2, '0')
        setSearchDate(`${year}-${month}-${dayStr}`)
        setIsDatePickerOpen(false)
    }

    const renderCalendarDays = () => {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const daysInMonth = getDaysInMonth(year, month)
        const firstDay = getFirstDayOfMonth(year, month)
        const days = []

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="p-2"></div>)
        }

        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
            const isSelected = searchDate === dateStr
            const isToday = new Date().toDateString() === new Date(year, month, i).toDateString()

            days.push(
                <button
                    key={i}
                    onClick={() => handleSelectDate(i)}
                    className={`h-9 w-9 mx-auto border flex items-center justify-center text-xs font-semibold transition-all
                        ${isSelected ? 'bg-text-main text-bg-base border-text-main font-bold' :
                            isToday ? 'bg-bg-hover text-text-main border-border-main font-bold' :
                                'text-text-main border-transparent hover:bg-bg-hover hover:border-border-main'}`}
                >
                    {i}
                </button>
            )
        }
        return days
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto transition-colors duration-300">
            {/* Header */}
            <div className="text-center">
                <h2 className="headline-xl text-text-main mb-2">
                    {t('archiveTitle')}
                </h2>
                <div className="thin-rule max-w-xs mx-auto my-2"></div>
                <p className="byline">
                    {t('archiveSubtitle')}
                </p>
            </div>

            {/* Centralized Search Card */}
            <div className="bg-bg-card border border-border-main p-6 sm:p-10 max-w-2xl mx-auto text-center flex flex-col items-center transition-colors duration-300">
                <div className="w-12 h-12 bg-bg-hover text-text-main flex items-center justify-center mb-4 border border-border-main">
                    <Calendar size={24} />
                </div>

                <h3 className="headline-md text-text-main mb-6">{t('archiveSelectDate')}</h3>

                <div className="w-full max-w-md space-y-4">
                    <div className="relative z-40">
                        {/* Custom Input Trigger */}
                        <div
                            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                            className="w-full px-4 py-3 border border-border-main bg-bg-base text-left flex justify-between items-center cursor-pointer hover:border-text-main transition-colors"
                        >
                            <span className={`byline font-bold ${searchDate ? 'text-text-main' : 'text-text-muted'}`}>
                                {searchDate || t('archiveDatePlaceholder')}
                            </span>
                        </div>

                        {searchDate && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSearchDate(''); }}
                                className="absolute inset-y-0 right-4 flex items-center text-text-muted hover:text-text-main transition-colors"
                            >
                                <XCircle className="h-4 w-4" />
                            </button>
                        )}

                        {/* Custom Calendar Popover */}
                        <AnimatePresence>
                            {isDatePickerOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.12 }}
                                    className="absolute top-full left-0 w-full mt-2 bg-bg-card border border-border-main p-4 overflow-hidden z-20 transition-colors duration-300"
                                >
                                    <div className="flex items-center justify-between mb-3 px-2">
                                        <button onClick={handlePrevMonth} className="p-1 hover:bg-bg-hover text-text-muted hover:text-text-main transition-colors">
                                            <ChevronLeft size={18} />
                                        </button>
                                        <h4 className="byline font-bold text-text-main">
                                            {currentMonth.toLocaleDateString(
                                                language === 'hi' ? 'hi-IN' :
                                                    language === 'ta' ? 'ta-IN' :
                                                        language === 'bn' ? 'bn-IN' :
                                                            language === 'te' ? 'te-IN' :
                                                                language === 'kn' ? 'kn-IN' :
                                                                    language === 'ml' ? 'ml-IN' :
                                                                        language === 'mr' ? 'mr-IN' : 'en-US',
                                                { month: 'long', year: 'numeric' }
                                            )}
                                        </h4>
                                        <button onClick={handleNextMonth} className="p-1 hover:bg-bg-hover text-text-muted hover:text-text-main transition-colors">
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        {t('archiveCalDays').split(',').map(day => (
                                            <div key={day} className="text-center byline text-[10px]">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-1">
                                        {renderCalendarDays()}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        onClick={() => { setIsDatePickerOpen(false); fetchByDate(searchDate); }}
                        className="w-full py-3 bg-text-main text-bg-base font-bold text-xs uppercase tracking-widest hover:opacity-80 transition-all"
                    >
                        {t('archiveFetch')}
                    </button>
                </div>
            </div>

            {/* Empty State / Skeletons */}
            {loading ? (
                <PolyglotLoader text="SCANNING HISTORICAL ARCHIVES" subtext="QUERYING CHRONOLOGICAL DISPATCHES" />
            ) : fetchedDate && articles.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-bg-card border border-border-main p-10 text-center text-text-muted max-w-2xl mx-auto transition-colors duration-300"
                >
                    <CalendarSearch size={36} className="mx-auto text-text-muted mb-3" />
                    <h3 className="headline-md text-text-main mb-2">{t('archiveNoNews')}</h3>
                    <p className="text-sm font-medium">{t('archiveNoNewsDesc').replace('{date}', searchDate)}</p>
                </motion.div>
            ) : !fetchedDate ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto opacity-40">
                    {[1, 2, 3].map((skel) => (
                        <div key={skel} className="bg-bg-card border border-border-main p-5 flex flex-col justify-between gap-4 min-h-[220px]">
                            <div className="flex flex-col gap-3">
                                <div className="h-4 bg-bg-hover w-24"></div>
                                <div className="h-6 bg-bg-hover w-full mt-2"></div>
                                <div className="h-6 bg-bg-hover w-3/4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-8 max-w-5xl mx-auto">
                    <AnimatePresence>
                        {sortedDates.map((date) => (
                            <motion.div
                                key={date}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="section-header mb-4">
                                    Archive Edition • {date}
                                </div>

                                <div className="grid gap-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                    {groupedArticles[date].map((article, index) => (
                                        <Link key={article.id} to={`/article/${article.id}`} className="block h-full">
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: index * 0.04 }}
                                                className="group h-full bg-bg-card p-5 border-b sm:border-r border-border-main hover:bg-bg-hover transition-colors cursor-pointer flex flex-col justify-between gap-4"
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <div className="byline">
                                                        {article.genre || 'General'} • {article.read_time_min}m read
                                                    </div>
                                                    <h4 className="headline-md text-text-main group-hover:underline leading-snug line-clamp-3">
                                                        {article.headline}
                                                    </h4>
                                                </div>
                                            </motion.div>
                                        </Link>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
