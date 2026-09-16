import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp, BookOpen, Clock, CheckCircle, Brain, ExternalLink, Trophy, Volume2, Square, Share2, Bookmark, BookmarkCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import PolyglotLoader from '../components/PolyglotLoader'

// Shuffle array — returns new array, does NOT mutate original
const shuffle = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

export default function ArticleDetail() {
    const { id } = useParams()
    const [article, setArticle] = useState(null)
    const [loading, setLoading] = useState(true)
    const [answers, setAnswers] = useState({})
    const [quizResult, setQuizResult] = useState(null)
    const [isRegenerating, setIsRegenerating] = useState(false)
    const [showOriginal, setShowOriginal] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [audioElement, setAudioElement] = useState(null)
    const [copied, setCopied] = useState(false)
    const [bookmarked, setBookmarked] = useState(false)
    const [related, setRelated] = useState([])
    const isSpeakingRef = useRef(false)
    const currentAudioRef = useRef(null)
    const { user } = useAuth()
    const { t, language } = useLanguage()

    // Shuffle questions + answers once per article load / language change
    const shuffledQuizzes = useMemo(() => {
        if (!article?.quizzes) return []
        return shuffle(article.quizzes).map(q => ({
            ...q,
            answers: shuffle(q.answers)
        }))
    }, [article?.quizzes, language])

    useEffect(() => {
        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')

        fetch(`${baseUrl}/api/articles/${id}?lang=${language}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setArticle(data)
                setLoading(false)
            })
            .catch(err => {
                console.error("Failed to fetch article", err)
                setLoading(false)
            })

        // Record article view in the background
        fetch(`${baseUrl}/api/articles/${id}/view`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => { })

        // Load bookmark status
        fetch(`${baseUrl}/api/bookmarks/${id}/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).then(d => setBookmarked(d.bookmarked)).catch(() => { })

        return () => {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause()
                currentAudioRef.current.src = ''
            }
        }
    }, [id, language, audioElement])

    // Fetch related articles after article loads
    useEffect(() => {
        if (!article?.genre) return
        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')
        fetch(`${baseUrl}/api/articles/related?genre=${encodeURIComponent(article.genre)}&exclude=${id}&lang=${language}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).then(d => setRelated(d.related || [])).catch(() => { })
    }, [article?.genre, id, language])

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }).catch(() => { })
    }

    const handleBookmark = async () => {
        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')
        const res = await fetch(`${baseUrl}/api/bookmarks/${id}`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
        })
        const d = await res.json()
        setBookmarked(d.bookmarked)
    }

    // Handle Text-To-Speech using Web Speech API (with Cloud TTS fallback)
    const toggleSpeech = async () => {
        if (!article) return

        if (isSpeaking) {
            isSpeakingRef.current = false
            setIsSpeaking(false)
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel()
            }
            if (currentAudioRef.current) {
                currentAudioRef.current.pause()
                currentAudioRef.current.src = ''
            }
            return
        }

        let textToRead = article.simplified_text
        if ((language === 'hi' || language === 'ta') && article.translations && article.translations[language]) {
            textToRead = article.translations[language].simplified_text
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(textToRead)
            utterance.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-US'
            utterance.rate = 0.95

            utterance.onend = () => {
                isSpeakingRef.current = false
                setIsSpeaking(false)
            }
            utterance.onerror = (e) => {
                console.error("Speech synthesis error", e)
                isSpeakingRef.current = false
                setIsSpeaking(false)
            }

            isSpeakingRef.current = true
            setIsSpeaking(true)
            window.speechSynthesis.speak(utterance)
            return
        }

        // Cloud TTS snippet fallback
        isSpeakingRef.current = true
        setIsSpeaking(true)

        const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
        const token = localStorage.getItem('token')

        const rawChunks = textToRead.match(/[^.!?।॥\n]+[.!?।॥\n]+/g) || [textToRead]
        const validChunks = rawChunks.map(c => c.trim()).filter(c => c.length > 1)

        if (validChunks.length === 0) {
            isSpeakingRef.current = false
            setIsSpeaking(false)
            return
        }

        const preloadedBlobs = new Map()

        const fetchSnippet = async (index, text) => {
            if (preloadedBlobs.has(index)) return preloadedBlobs.get(index)
            try {
                const response = await fetch(`${baseUrl}/api/tts/snippet`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, lang: language })
                })
                if (!response.ok) throw new Error("Snippet API failed")
                const blob = await response.blob()
                preloadedBlobs.set(index, blob)
                return blob
            } catch (err) {
                console.error("Failed to fetch audio snippet", err)
                return null
            }
        }

        for (let i = 0; i < validChunks.length; i++) {
            if (!isSpeakingRef.current) break

            if (i + 1 < validChunks.length) {
                fetchSnippet(i + 1, validChunks[i + 1]).catch(() => { })
            }

            const blob = await fetchSnippet(i, validChunks[i])
            if (!blob || !isSpeakingRef.current) break

            const objectUrl = URL.createObjectURL(blob)
            const newAudio = new Audio(objectUrl)
            currentAudioRef.current = newAudio

            await new Promise((resolve) => {
                newAudio.onended = () => {
                    URL.revokeObjectURL(objectUrl)
                    resolve()
                }
                newAudio.onerror = (e) => {
                    console.error("Cloud TTS Playback Error:", e)
                    URL.revokeObjectURL(objectUrl)
                    resolve()
                }
                newAudio.play().catch(err => {
                    console.error("Autoplay prevented:", err)
                    isSpeakingRef.current = false
                    resolve()
                })
            })
        }

        isSpeakingRef.current = false
        setIsSpeaking(false)
        currentAudioRef.current = null
    }

    const handleSelectAnswer = (quizId, answerId) => {
        setAnswers(prev => ({ ...prev, [quizId]: answerId }))
    }

    const submitQuiz = async (e) => {
        e.preventDefault()
        try {
            const baseUrl = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '')
            const token = localStorage.getItem('token')

            const res = await fetch(`${baseUrl}/api/quiz/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ answers, viewed_original: showOriginal })
            })
            const data = await res.json()
            setQuizResult(data)
        } catch (err) {
            console.error("Failed to submit quiz", err)
        }
    }

    const handleRegenerateQuiz = async () => {
        if (isRegenerating) return
        setIsRegenerating(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${baseUrl}/api/articles/${id}/regenerate-quiz?lang=${language}`, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            })
            if (res.ok) {
                const data = await res.json()
                if (data.quizzes && data.quizzes.length > 0) {
                    setArticle(prev => ({ ...prev, quizzes: data.quizzes }))
                    setAnswers({})
                    setQuizResult(null)
                }
            }
        } catch (err) {
            console.error("Failed to regenerate quiz", err)
        } finally {
            setIsRegenerating(false)
        }
    }

    if (loading || !article) {
        return <PolyglotLoader fullPage text="TRANSLATING & VERIFYING" subtext="DECODING MULTILINGUAL ARTICLE" />
    }

    const isVerified = article.fact_confidence >= 90

    return (
        <div className="relative transition-colors duration-300">
            <Link to="/" className="inline-flex items-center gap-2 text-text-muted hover:text-text-main font-semibold mb-6 transition-colors text-sm uppercase tracking-widest">
                <ArrowLeft size={16} /> {t('backToFeed')}
            </Link>

            <article className="bg-bg-card border border-border-main p-6 sm:p-10 transition-colors duration-300">
                {article.is_available === false && (
                    <div className="mb-6 border border-border-main bg-bg-hover p-4 flex items-center gap-3 text-text-main font-bold text-sm">
                        <AlertTriangle size={18} className="shrink-0" />
                        <span>{t('translationUnavailable')}</span>
                    </div>
                )}

                {/* ═══ HEADLINE ═══ */}
                <h1 className="font-serif text-3xl sm:text-5xl font-black text-text-main leading-tight mb-4 tracking-tight">
                    {article.headline}
                </h1>

                {/* ═══ BYLINE / DATELINE ═══ */}
                <div className="byline flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
                    <span>{article.publisher_name}</span>
                    <span>•</span>
                    <span>{article.date || 'Today'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                        <Clock size={10} /> {article.read_time_min} {t('minRead')}
                    </span>
                </div>

                {/* Verification badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-widest border mb-6 ${isVerified ? 'border-text-main text-text-main' : 'border-text-muted text-text-muted'}`}>
                    {isVerified ? (
                        <>
                            <ShieldCheck size={14} />
                            <span>Verified {article.fact_confidence.toFixed(0)}% • {article.matched_entities} entities</span>
                        </>
                    ) : (
                        <>
                            <AlertTriangle size={14} />
                            <span>Low Confidence ({article.fact_confidence.toFixed(0)}%)</span>
                        </>
                    )}
                </div>

                <div className="thick-rule mb-6"></div>

                {/* ═══ ACTION BUTTONS ═══ */}
                <div className="flex flex-wrap items-center gap-3 mb-8">
                    <button
                        onClick={toggleSpeech}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all border
                            ${isSpeaking
                                ? 'bg-text-main text-bg-base border-text-main'
                                : 'bg-bg-card text-text-main border-border-main hover:bg-text-main hover:text-bg-base'
                            }`}
                    >
                        {isSpeaking ? (
                            <>
                                <Square size={12} className="fill-current" />
                                <span>{t('stopAudio')}</span>
                            </>
                        ) : (
                            <>
                                <Volume2 size={14} />
                                <span>{t('listenAudio')}</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border border-border-main hover:bg-text-main hover:text-bg-base transition-all"
                    >
                        {copied ? <CheckCircle size={12} /> : <Share2 size={12} />}
                        {copied ? 'Copied!' : 'Share'}
                    </button>

                    <button
                        onClick={handleBookmark}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all
                            ${bookmarked ? 'bg-text-main text-bg-base border-text-main' : 'border-border-main hover:bg-text-main hover:text-bg-base'}`}
                    >
                        {bookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                        {bookmarked ? t('saved') : t('save')}
                    </button>

                    {!isSpeaking && (
                        <span className="text-text-muted text-xs italic">{t('readSilently')}</span>
                    )}
                </div>

                {/* ═══ ARTICLE BODY — Multi-Column with Drop Cap ═══ */}
                <div className="newspaper-columns mb-12 space-y-4">
                    {article.simplified_text.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className={`${idx === 0 ? 'drop-cap' : ''} text-base leading-relaxed text-text-main`}>
                            {paragraph.trim()}
                        </p>
                    ))}
                </div>

                {/* ═══ QUIZ SECTION ═══ */}
                {article.quizzes && article.quizzes.length > 0 && (
                    <div className="border border-border-main p-6 sm:p-8 mb-10 relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-text-main"></div>
                        <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-main">
                            <h3 className="headline-lg text-text-main">
                                {t('testComprehension')}
                            </h3>
                            <button
                                type="button"
                                onClick={handleRegenerateQuiz}
                                disabled={isRegenerating}
                                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-main transition-colors px-2.5 py-1.5 border border-border-subtle hover:border-border-main bg-bg-surface cursor-pointer disabled:opacity-50"
                                title="Generate fresh dynamic questions based on this summary"
                            >
                                <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                                <span>{isRegenerating ? "Generating..." : "New Questions"}</span>
                            </button>
                        </div>

                        <AnimatePresence>
                            {quizResult ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-6"
                                >
                                    <div className={`border p-6 text-center ${quizResult.score > 60 ? 'border-text-main' : 'border-text-muted'}`}>
                                        <div className="flex justify-center mb-3">
                                            <CheckCircle className="w-8 h-8 text-text-main" />
                                        </div>
                                        <h4 className="headline-lg mb-1">Quiz Complete!</h4>
                                        <p className="text-sm font-bold text-text-muted">
                                            You scored {quizResult.score.toFixed(0)}% ({quizResult.correct}/{quizResult.total})
                                        </p>
                                    </div>

                                    <div className="space-y-4 mt-6">
                                        <h4 className="text-sm font-bold uppercase tracking-widest text-text-muted border-b border-border-main pb-2">Review Your Answers</h4>
                                        {article.quizzes.map((quiz, i) => {
                                            const userAnswerId = answers[quiz.id];
                                            const correctAnswer = quizResult.correct_answers?.[quiz.id];
                                            const isCorrect = String(userAnswerId) === String(correctAnswer?.id);
                                            const userAnswerText = quiz.answers.find(a => String(a.id) === String(userAnswerId))?.text;

                                            return (
                                                <div key={quiz.id} className={`p-4 border ${isCorrect ? 'border-text-main bg-bg-hover' : 'border-text-muted'}`}>
                                                    <p className="font-bold text-text-main mb-2 text-sm">{i + 1}. {quiz.question_text}</p>
                                                    <div className="space-y-1 text-xs">
                                                        <p className={isCorrect ? 'font-bold' : 'line-through opacity-60'}>
                                                            <span className="font-bold">Your Answer:</span> {userAnswerText || "Left Blank"}
                                                        </p>
                                                        {!isCorrect && (
                                                            <p className="font-bold bg-bg-hover p-1.5">
                                                                ✓ Correct: {correctAnswer?.text}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setQuizResult(null) || setAnswers({})}
                                        className="mt-4 border border-border-main text-text-main hover:bg-text-main hover:text-bg-base font-bold text-xs uppercase tracking-widest py-2.5 px-6 transition-all"
                                    >
                                        {t('retakeQuiz')}
                                    </button>
                                </motion.div>
                            ) : (
                                <form onSubmit={submitQuiz} className="space-y-6">
                                    {shuffledQuizzes.map((quiz, i) => (
                                        <div key={quiz.id} className="space-y-3">
                                            <p className="font-bold text-text-main text-sm">{i + 1}. {quiz.question_text}</p>
                                            <div className="grid gap-2">
                                                {quiz.answers.map(ans => (
                                                    <label
                                                        key={ans.id}
                                                        className={`flex items-center gap-3 p-3 border cursor-pointer transition-all text-sm
                                                            ${answers[quiz.id] === ans.id
                                                                ? 'border-text-main bg-bg-hover font-semibold'
                                                                : 'border-border-subtle hover:border-border-main text-text-muted hover:text-text-main'
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`quiz_${quiz.id}`}
                                                            value={ans.id}
                                                            checked={answers[quiz.id] === ans.id}
                                                            onChange={() => handleSelectAnswer(quiz.id, ans.id)}
                                                            className="hidden"
                                                            required
                                                        />
                                                        <div className={`w-4 h-4 border-2 flex items-center justify-center ${answers[quiz.id] === ans.id ? 'border-text-main' : 'border-border-main'}`}>
                                                            {answers[quiz.id] === ans.id && <div className="w-2 h-2 bg-text-main" />}
                                                        </div>
                                                        <span>{ans.text}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="submit"
                                        className="mt-4 bg-text-main text-bg-base font-bold text-sm uppercase tracking-widest py-3 px-8 hover:opacity-80 transition-all"
                                    >
                                        {t('submitAnswers')}
                                    </button>
                                </form>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* ═══ DIRECT SOURCE LINK ═══ */}
                {article.original_url && (
                    <div className="border border-border-main p-4 bg-bg-card flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                        <span className="byline">{t('originalSource')} • {article.publisher_name}</span>
                        <a
                            href={article.original_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-main border border-border-main px-4 py-2 hover:bg-text-main hover:text-bg-base transition-colors"
                        >
                            <span>Read Full Original Article</span>
                            <ExternalLink size={14} />
                        </a>
                    </div>
                )}

            </article>

            {/* ═══ RELATED ARTICLES ═══ */}
            {related.length > 0 && (
                <div className="mt-8">
                    <div className="section-header">More in {article.genre}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
                        {related.map((rel, i) => (
                            <motion.div key={rel.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                                <Link to={`/article/${rel.id}`}>
                                    <div className="group p-4 border-b sm:border-b-0 sm:border-r border-border-main last:border-r-0 cursor-pointer">
                                        <span className="byline font-bold block mb-1">
                                            {rel.genre}
                                        </span>
                                        <p className="headline-sm text-text-main leading-snug group-hover:underline transition-colors" style={{ fontSize: '0.9rem' }}>
                                            {rel.headline}
                                        </p>
                                        <p className="byline mt-1 flex items-center gap-1">
                                            <Clock size={10} /> {rel.read_time_min}m
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
