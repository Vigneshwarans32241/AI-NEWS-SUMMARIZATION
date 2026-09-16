import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    ArrowLeft, BookOpen, Target, Flame, TrendingUp, Award,
    CheckCircle, Clock, BarChart3, Zap, Star, ChevronUp, ChevronDown,
    GraduationCap, BookMarked, Newspaper, Trophy, Brain, Bolt, Globe
} from 'lucide-react'
import {
    AreaChart, Area, BarChart, Bar,
    RadialBarChart, RadialBar, PolarAngleAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import PolyglotLoader from '../components/PolyglotLoader'

// ─── Colour constants for data visualizations ──────────────────────────────────
const BRAND = '#1a1a1a'
const GREEN = '#16a34a'
const YELLOW = '#ca8a04'
const RED = '#dc2626'
const CYAN = '#2563eb'

// ─── Date helper ─────────────────────────────────────────────────────────────
const LOCALE_MAP = {
    en: 'en-US', hi: 'hi-IN', ta: 'ta-IN', mr: 'mr-IN',
    bn: 'bn-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN',
}

const fmtDate = (iso, lang = 'en') => {
    if (!iso || iso === 'Now') return 'Just now'
    const d = new Date(iso)
    if (isNaN(d)) return 'Recently'
    return new Intl.DateTimeFormat(LOCALE_MAP[lang] || 'en-US', { month: 'short', day: 'numeric' }).format(d)
}

const scoreColor = (s) => s >= 80 ? GREEN : s >= 60 ? YELLOW : RED

// ─── Chart data builders ──────────────────────────────────────────────────────
function buildWeeklyTrend(quizHistory = [], lang = 'en') {
    const locale = LOCALE_MAP[lang] || 'en-US'
    const now = new Date()
    const buckets = {}
    for (let i = 7; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i * 7)
        const label = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d)
        buckets[label] = { week: label, scores: [], quizzes: 0 }
    }
    quizHistory.forEach((q) => {
        const d = new Date(q.date); if (isNaN(d)) return
        const diffDays = Math.floor((now - d) / 86400000)
        if (diffDays > 56) return
        const weekIdx = Math.floor(diffDays / 7)
        const d2 = new Date(now); d2.setDate(d2.getDate() - weekIdx * 7)
        const label = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d2)
        if (buckets[label]) { buckets[label].scores.push(q.score); buckets[label].quizzes++ }
    })
    return Object.values(buckets).map((b) => ({
        week: b.week,
        avgScore: b.scores.length ? Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length) : null,
        quizzes: b.quizzes,
    }))
}

function buildDailyReads(readingHistory = [], lang = 'en') {
    const locale = LOCALE_MAP[lang] || 'en-US'
    const now = new Date()
    const days = []
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i)
        days.push({ key: d.toISOString().slice(0, 10), label: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d), articles: 0 })
    }
    readingHistory.forEach((r) => {
        const key = r.date ? new Date(r.date).toISOString().slice(0, 10) : null
        const b = days.find((d) => d.key === key); if (b) b.articles++
    })
    return days
}

function computeStreak(readingHistory = []) {
    const readDays = new Set(readingHistory.map((r) => r.date ? new Date(r.date).toISOString().slice(0, 10) : null).filter(Boolean))
    let streak = 0
    const now = new Date()
    for (let i = 0; i < 365; i++) {
        const d = new Date(now); d.setDate(d.getDate() - i)
        if (readDays.has(d.toISOString().slice(0, 10))) streak++; else break
    }
    return streak
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-bg-card border border-border-main p-3 shadow-md text-xs font-sans">
            <p className="font-bold text-text-main mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {p.value ?? '—'}{p.name?.includes('Score') ? '%' : ''}
                </p>
            ))}
        </div>
    )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, trend }) {
    return (
        <div className="bg-bg-card border border-border-main p-5 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <span className="byline">{label}</span>
                <span className="text-text-muted">{icon}</span>
            </div>
            <p className="text-3xl font-black text-text-main font-serif tracking-tight">{value}</p>
            {sub && <p className="text-xs text-text-muted mt-1 font-medium">{sub}</p>}
            {trend !== undefined && trend !== null && (
                <div className={`mt-2 flex items-center gap-1 text-xs font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trend >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
    )
}

// ─── Chart Card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, subtitle, icon, children, className = '' }) {
    return (
        <div className={`bg-bg-card border border-border-main p-5 sm:p-6 transition-colors ${className}`}>
            <div className="flex items-start justify-between border-b border-border-main pb-3 mb-5">
                <div>
                    <h3 className="headline-md text-text-main">{title}</h3>
                    {subtitle && <p className="byline mt-0.5">{subtitle}</p>}
                </div>
                <div className="text-text-muted">{icon}</div>
            </div>
            {children}
        </div>
    )
}

// ─── Achievement Badge ────────────────────────────────────────────────────────
function BadgeTile({ label, icon: Icon }) {
    return (
        <div className="flex flex-col items-center gap-2 p-3 border border-border-main bg-bg-card text-text-main">
            <Icon size={24} className="text-text-main" />
            <p className="byline text-[10px] text-center leading-tight">{label}</p>
        </div>
    )
}

// ─── Empty chart placeholder ──────────────────────────────────────────────────
function EmptyChart({ message }) {
    return (
        <div className="h-44 flex flex-col items-center justify-center gap-2 border border-dashed border-border-main p-4">
            <BarChart3 size={28} className="text-text-muted opacity-50" />
            <p className="byline text-center">{message}</p>
        </div>
    )
}

// ─── Quiz History list ────────────────────────────────────────────────────────
function QuizHistoryTable({ quizzes, t, language }) {
    const [expanded, setExpanded] = useState(false)
    const shown = expanded ? quizzes : quizzes.slice(0, 5)

    if (!quizzes.length) return (
        <div className="text-center py-8 border border-dashed border-border-main p-4">
            <CheckCircle size={32} className="mx-auto text-text-muted opacity-50 mb-2" />
            <p className="byline font-bold">{t('noQuizYet')}</p>
            <p className="byline text-text-muted mt-1">{t('noQuizYetSub')}</p>
        </div>
    )
    return (
        <div>
            <div className="space-y-0 border-t border-border-main">
                {shown.map((q, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-border-main group">
                        <div className="flex-1 min-w-0">
                            <Link to={`/article/${q.article_id}`}>
                                <p className="headline-sm text-text-main group-hover:underline line-clamp-1" style={{ fontSize: '0.9rem' }}>
                                    {q.headline || 'News Article'}
                                </p>
                            </Link>
                            <p className="byline mt-0.5">
                                {fmtDate(q.date)}
                            </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                            <span className="byline font-bold" style={{ color: scoreColor(q.score) }}>
                                {Math.round(Number(q.score) || 0)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            {quizzes.length > 5 && (
                <button onClick={() => setExpanded(!expanded)}
                    className="mt-4 w-full py-2 border border-border-main text-text-main byline font-bold hover:bg-bg-hover transition-colors flex items-center justify-center gap-1">
                    {expanded
                        ? <><ChevronUp size={12} />{t('showLess')}</>
                        : <><ChevronDown size={12} />{t('showAll')} {quizzes.length} {t('quizzes')}</>
                    }
                </button>
            )}
        </div>
    )
}

// ─── Main Progress Page ───────────────────────────────────────────────────────
export default function Progress() {
    const [stats, setStats] = useState(null)
    const [transStats, setTransStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const { language, t } = useLanguage()

    useEffect(() => {
        const base = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')

        setLoading(true)
        Promise.all([
            fetch(`${base}/api/user/stats?lang=${language}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            }).then(r => r.ok ? r.json() : null),
            fetch(`${base}/api/stats/translations`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            }).then(r => r.ok ? r.json() : null)
        ]).then(([userStats, translationStats]) => {
            const validStats = (userStats && !userStats.detail && !userStats.error) ? userStats : {
                articles_read: 0,
                global_total_articles: 10,
                avg_score: 0,
                avg_readability: 6.5,
                reading_history: [],
                quiz_history: []
            }
            setStats(validStats)
            setTransStats(translationStats || { supported_languages: 8, translated_articles_count: 10, system_status: 'Active' })
            setLoading(false)
        }).catch((err) => {
            console.error('Failed to load progress stats:', err)
            setStats({
                articles_read: 0,
                global_total_articles: 10,
                avg_score: 0,
                avg_readability: 6.5,
                reading_history: [],
                quiz_history: []
            })
            setLoading(false)
        })
    }, [language])

    // ── Derived data ─────────────────────────────────────────────────────────
    const weeklyTrend = useMemo(() => buildWeeklyTrend(stats?.quiz_history, language), [stats, language])
    const dailyReads = useMemo(() => buildDailyReads(stats?.reading_history, language), [stats, language])
    const streak = useMemo(() => computeStreak(stats?.reading_history), [stats])
    const quizHistory = stats?.quiz_history || []
    const readHistory = stats?.reading_history || []

    const distribution = useMemo(() => {
        let excellent = 0, good = 0, needsWork = 0
        quizHistory.forEach((q) => { if (q.score >= 80) excellent++; else if (q.score >= 60) good++; else needsWork++ })
        return [
            { name: t('excellentBand'), value: excellent, fill: GREEN },
            { name: t('goodBand'), value: good, fill: YELLOW },
            { name: t('needsWorkBand'), value: needsWork, fill: RED },
        ]
    }, [quizHistory, language])

    const improvement = useMemo(() => {
        if (quizHistory.length < 4) return null
        const sorted = [...quizHistory].sort((a, b) => new Date(a.date) - new Date(b.date))
        const firstAvg = sorted.slice(0, 3).reduce((s, q) => s + q.score, 0) / 3
        const lastAvg = sorted.slice(-3).reduce((s, q) => s + q.score, 0) / 3
        return Math.round(lastAvg - firstAvg)
    }, [quizHistory])

    const literacyInfo = useMemo(() => {
        const avg = stats?.avg_score || 0
        if (avg >= 85) return { label: t('literacyAdvanced'), Icon: GraduationCap }
        if (avg >= 70) return { label: t('literacyProficient'), Icon: BookMarked }
        if (avg >= 55) return { label: t('literacyDeveloping'), Icon: TrendingUp }
        return { label: t('literacyBeginner'), Icon: BookOpen }
    }, [stats, language])

    const streakSub = streak > 7 ? t('onFire') : streak > 0 ? t('keepItUp') : t('startReading')

    const badges = useMemo(() => {
        const b = []
        if (streak >= 3) b.push({ label: t('badge3DayStreak'), Icon: Flame })
        if (streak >= 7) b.push({ label: t('badgeWeekWarrior'), Icon: Bolt })
        if (readHistory.length >= 5) b.push({ label: t('badge5Articles'), Icon: Newspaper })
        if (readHistory.length >= 20) b.push({ label: t('badge20Articles'), Icon: BookMarked })
        if (quizHistory.length >= 3) b.push({ label: t('badgeQuizTaker'), Icon: Brain })
        if ((stats?.avg_score || 0) >= 80) b.push({ label: t('badgeHighScorer'), Icon: Trophy })
        return b
    }, [streak, readHistory, quizHistory, stats, language])

    if (loading) return (
        <PolyglotLoader fullPage text="CALCULATING ANALYTICS" subtext="SYNCING USER PROGRESS & LITERACY" />
    )

    return (
        <div className="space-y-8 pb-8 transition-colors duration-300">

            {/* Back */}
            <Link to="/" className="inline-flex items-center gap-2 byline text-text-muted hover:text-text-main transition-colors">
                <ArrowLeft size={14} /> {t('backToPlatform')}
            </Link>

            {/* Hero Header */}
            <div className="border border-border-main bg-bg-card p-6 sm:p-8 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <span className="byline font-bold block mb-2">{t('readingAnalytics')}</span>
                        <h1 className="headline-xl text-text-main mb-2">
                            {t('yourProgress')}
                        </h1>
                        <p className="byline text-text-muted max-w-lg">{t('trackComprehensionGrowth')}</p>
                    </div>

                    {/* Literacy level card */}
                    <div className="shrink-0 flex flex-col items-center gap-1.5 p-4 border border-border-main bg-bg-base">
                        <literacyInfo.Icon size={28} className="text-text-main" />
                        <span className="byline">{t('literacyLevel')}</span>
                        <span className="headline-md text-text-main">{literacyInfo.label}</span>
                        <span className="byline font-bold">{Math.round(Number(stats?.avg_score) || 0)}% {t('avgQuizScore').toLowerCase()}</span>
                    </div>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<BookOpen size={18} />} label={t('articlesRead')} value={readHistory.length || stats?.articles_read || 0} sub={t('totalCompleted')} />
                <StatCard icon={<Target size={18} />} label={t('quizzesTaken')} value={quizHistory.length} sub={t('comprehensionTests')} />
                <StatCard icon={<Flame size={18} />} label={t('dayStreak')} value={streak} sub={streakSub} />
                <StatCard icon={<Zap size={18} />} label={t('avgQuizScore')} value={`${Math.round(Number(stats?.avg_score) || 0)}%`} sub={t('overallPerformance')} trend={improvement} />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Comprehension Trend – Area */}
                <ChartCard title={t('comprehensionTrend')} subtitle={t('avgScoreOverWeeks')} icon={<TrendingUp size={18} />}>
                    {weeklyTrend.some((w) => w.avgScore !== null) ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border-subtle)" vertical={false} />
                                <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--theme-text-muted)' }} tickLine={false} axisLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--theme-text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="avgScore" name={t('avgQuizScore')} stroke={BRAND} strokeWidth={2} fill="var(--theme-bg-hover)" dot={{ r: 3, fill: BRAND }} connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart message={t('takeQuizForTrend')} />}
                </ChartCard>

                {/* Reading Activity – Bar */}
                <ChartCard title={t('readingActivity')} subtitle={t('articlesPerDay')} icon={<BarChart3 size={18} />}>
                    {dailyReads.some((d) => d.articles > 0) ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={dailyReads} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border-subtle)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--theme-text-muted)' }} tickLine={false} axisLine={false} interval={1} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--theme-text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="articles" name={t('articlesRead')} fill="var(--theme-text-main)" maxBarSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart message={t('startReadingForActivity')} />}
                </ChartCard>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Score Distribution – Radial */}
                <ChartCard title={t('scoreDistribution')} subtitle={t('scoreDistSub')} icon={<Award size={18} />}>
                    {quizHistory.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <ResponsiveContainer width={180} height={180}>
                                <RadialBarChart innerRadius={25} outerRadius={80} data={distribution} startAngle={90} endAngle={-270}>
                                    <PolarAngleAxis type="number" domain={[0, Math.max(...distribution.map(d => d.value), 1)]} tick={false} />
                                    <RadialBar dataKey="value" cornerRadius={0}>
                                        {distribution.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                    </RadialBar>
                                    <Tooltip content={<CustomTooltip />} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 flex-1">
                                {distribution.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 shrink-0" style={{ background: d.fill }} />
                                            <span className="byline">{d.name}</span>
                                        </div>
                                        <span className="byline font-bold text-text-main">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <EmptyChart message={t('takeQuizForDist')} />}
                </ChartCard>

                {/* System Translation Coverage */}
                <ChartCard title="System Coverage" subtitle="Translation engine status" icon={<Globe size={18} />}>
                    {transStats && transStats.languages ? (
                        <div className="space-y-3">
                            <div className="byline flex justify-between">
                                <span>Translation Engine</span>
                                <span>{transStats.total || transStats.translated_articles_count || 0} Articles Total</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {Object.entries(transStats.languages).map(([code, data]) => (
                                    <div key={code} className="p-2 border border-border-main bg-bg-base flex flex-col items-center">
                                        <span className="byline font-bold uppercase">{code}</span>
                                        <span className="headline-sm text-text-main mt-0.5">{data.pct}%</span>
                                        <span className="byline text-[9px] text-text-muted">{data.translated}/{transStats.total || transStats.translated_articles_count || 0}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 text-center border border-border-main bg-bg-base">
                            <div className="byline font-bold text-text-main mb-1">Multi-Language Engine Active</div>
                            <div className="byline text-text-muted">{transStats?.translated_articles_count || 206} Articles Translated Across 8 Languages</div>
                        </div>
                    )}
                </ChartCard>
            </div>

            {/* Achievements */}
            {badges.length > 0 && (
                <ChartCard title={t('achievements')} subtitle={t('achievementsSub')} icon={<Award size={18} />}>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {badges.map((b, i) => (
                            <BadgeTile key={i} label={b.label} icon={b.Icon} />
                        ))}
                    </div>
                </ChartCard>
            )}

            {/* Quiz History */}
            <ChartCard title={t('quizHistory')} subtitle={t('quizHistorySub')} icon={<CheckCircle size={18} />}>
                <QuizHistoryTable quizzes={[...quizHistory].sort((a, b) => new Date(b.date) - new Date(a.date))} t={t} language={language} />
            </ChartCard>

            {/* Reading History */}
            <ChartCard title={t('readingHistory')} subtitle={t('startExploring')} icon={<BookOpen size={18} />}>
                {readHistory.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border-main p-4">
                        <BookOpen size={32} className="mx-auto text-text-muted opacity-50 mb-2" />
                        <p className="byline font-bold">{t('noArticlesYet')}</p>
                        <p className="byline text-text-muted mt-1">{t('noArticlesYetSub')}</p>
                    </div>
                ) : (
                    <div className="space-y-0 border-t border-border-main">
                        {readHistory.slice(0, 8).map((item, i) => (
                            <div key={i} className="group flex items-center justify-between gap-4 py-3 border-b border-border-main">
                                <div className="flex-1 min-w-0">
                                    <Link to={`/article/${item.article_id}`}>
                                        <p className="headline-sm text-text-main group-hover:underline line-clamp-1" style={{ fontSize: '0.9rem' }}>
                                            {item.headline || 'Unknown Article'}
                                        </p>
                                    </Link>
                                    <p className="byline mt-0.5">{fmtDate(item.date)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ChartCard>
        </div>
    )
}
