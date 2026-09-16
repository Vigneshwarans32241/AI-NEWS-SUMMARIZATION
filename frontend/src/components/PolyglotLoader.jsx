import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// Multilingual Glyph Pool representing English, Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi & Editorial Glyphs
const GLYPHS = [
    // Latin
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    // Devanagari (Hindi / Marathi)
    'अ', 'आ', 'इ', 'क', 'ख', 'ग', 'घ', 'च', 'ज', 'त', 'द', 'न', 'प', 'म', 'य', 'र', 'ल', 'व', 'श', 'स', 'ह',
    // Tamil
    'அ', 'ஆ', 'இ', 'க', 'ங', 'ச', 'ஞ', 'ட', 'த', 'ந', 'ப', 'ம', 'ய', 'ர', 'ல', 'வ', 'ழ', 'ள', 'ற', 'ன',
    // Telugu
    'అ', 'ఆ', 'ఇ', 'క', 'గ', 'చ', 'జ', 'త', 'ద', 'న', 'ప', 'బ', 'మ', 'య', 'ర', 'ల', 'వ', 'స', 'హ',
    // Kannada
    'ಅ', 'ಆ', 'ಇ', 'ಕ', 'ಗ', 'ಚ', 'ಜ', 'ತ', 'ದ', 'ನ', 'ಪ', 'ಬ', 'ಮ', 'ಯ', 'ರ', 'ಲ', 'ವ', 'ಸ', 'ಹ',
    // Malayalam
    'അ', 'ആ', 'ഇ', 'ക', 'ഗ', 'ച', 'ജ', 'ത', 'ദ', 'ന', 'പ', 'ബ', 'മ', 'യ', 'ര', 'ല', 'വ', 'സ', 'ഹ',
    // Bengali
    'অ', 'আ', 'ই', 'ক', 'খ', 'গ', 'ঘ', 'চ', 'জ', 'ত', 'দ', 'ন', 'প', 'ব', 'ম', 'য', 'র', 'ল', 'শ', 'স', 'হ',
    // Editorial marks
    '§', '¶', '✦', '※', '❖', '◈'
]

const DEFAULT_PHRASES = [
    "THE DAILY DISPATCH",
    "DECODING HEADLINES",
    "MULTI-LINGUAL SYNC",
    "AI FACT VERIFYING",
    "SIMPLIFYING EDITION"
]

export default function PolyglotLoader({ 
    text, 
    subtext = "TYPESETTING MULTILINGUAL EDITION", 
    fullPage = false,
    className = "" 
}) {
    const phrases = text ? [text] : DEFAULT_PHRASES
    const [phraseIndex, setPhraseIndex] = useState(0)
    const currentTarget = phrases[phraseIndex]
    
    // Displayed characters array
    const [displayedChars, setDisplayedChars] = useState([])
    const [lockedIndices, setLockedIndices] = useState(new Set())

    useEffect(() => {
        let active = true
        const targetLen = currentTarget.length
        let locked = new Set()
        setLockedIndices(new Set())

        // Initialize random characters
        setDisplayedChars(
            Array.from({ length: targetLen }, (_, i) => 
                currentTarget[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
            )
        )

        let step = 0
        const interval = setInterval(() => {
            if (!active) return

            step++
            
            // Randomly pick an unlocked index to lock in its target character
            const unlocked = []
            for (let i = 0; i < targetLen; i++) {
                if (currentTarget[i] !== ' ' && !locked.has(i)) {
                    unlocked.push(i)
                }
            }

            if (step % 2 === 0 && unlocked.length > 0) {
                // Lock 1 or 2 characters toward final form
                const idxToLock = unlocked[Math.floor(Math.random() * unlocked.length)]
                locked = new Set([...locked, idxToLock])
                setLockedIndices(new Set(locked))
            }

            // Shuffle all remaining unlocked characters
            setDisplayedChars(prev => 
                Array.from({ length: targetLen }, (_, i) => {
                    if (currentTarget[i] === ' ') return ' '
                    if (locked.has(i)) return currentTarget[i]
                    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
                })
            )

            // Once fully locked, wait and cycle to next phrase if multiple phrases
            if (locked.size >= targetLen - (currentTarget.split(' ').length - 1)) {
                if (phrases.length > 1) {
                    setTimeout(() => {
                        if (active) {
                            setPhraseIndex(prev => (prev + 1) % phrases.length)
                        }
                    }, 1400)
                }
            }
        }, 55)

        return () => {
            active = false
            clearInterval(interval)
        }
    }, [currentTarget, phraseIndex])

    const content = (
        <div className={`flex flex-col items-center justify-center p-8 text-center select-none ${className}`}>
            {/* Top vintage double rule */}
            <div className="w-48 max-w-full flex flex-col items-center gap-[2px] mb-5">
                <div className="w-full h-[2px] bg-border-main" />
                <div className="w-full h-[1px] bg-border-main opacity-50" />
            </div>

            {/* Matrix Glyph Decoder Display */}
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 max-w-2xl px-2 py-3 bg-bg-card border border-border-main shadow-sm">
                {displayedChars.map((char, idx) => {
                    const isSpace = currentTarget[idx] === ' '
                    const isLocked = lockedIndices.has(idx)

                    if (isSpace) {
                        return <span key={idx} className="w-2 sm:w-3" />
                    }

                    return (
                        <motion.span
                            key={idx}
                            initial={{ scale: 0.9, opacity: 0.7 }}
                            animate={{ 
                                scale: isLocked ? 1 : [0.95, 1.05, 0.95],
                                opacity: isLocked ? 1 : 0.85
                            }}
                            transition={{ duration: 0.2 }}
                            className={`inline-flex items-center justify-center w-7 h-8 sm:w-8 sm:h-9 text-base sm:text-lg font-bold transition-colors duration-150 border ${
                                isLocked 
                                    ? 'bg-bg-base border-border-main text-text-main font-serif' 
                                    : 'bg-bg-card border-border-subtle text-text-muted font-sans'
                            }`}
                            style={{
                                textShadow: isLocked ? 'none' : '0 0 2px var(--theme-border-main)'
                            }}
                        >
                            {char}
                        </motion.span>
                    )
                })}
            </div>

            {/* Bottom vintage double rule */}
            <div className="w-48 max-w-full flex flex-col items-center gap-[2px] mt-5 mb-4">
                <div className="w-full h-[1px] bg-border-main opacity-50" />
                <div className="w-full h-[2px] bg-border-main" />
            </div>

            {/* Polyglot Scripts Status Badge */}
            <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-text-main animate-ping" />
                <p className="byline font-bold tracking-widest uppercase text-[11px] text-text-main">
                    {subtext}
                </p>
            </div>

            {/* Language Codes Ribbon */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5 opacity-60">
                {['EN', 'HI', 'TA', 'TE', 'KN', 'ML', 'MR', 'BN'].map((langCode) => (
                    <span 
                        key={langCode} 
                        className="text-[9px] font-mono px-1.5 py-0.5 border border-border-subtle bg-bg-base text-text-muted"
                    >
                        {langCode}
                    </span>
                ))}
            </div>
        </div>
    )

    if (fullPage) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                {content}
            </div>
        )
    }

    return content
}
