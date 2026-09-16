import { useState, useCallback } from 'react'

const STORAGE_KEY = 'readHistory'

function getStored() {
    try {
        return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
    } catch {
        return new Set()
    }
}

export default function useReadHistory() {
    const [readIds, setReadIds] = useState(() => getStored())

    const markRead = useCallback((id) => {
        setReadIds(prev => {
            if (prev.has(id)) return prev
            const next = new Set(prev)
            next.add(id)
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])) } catch { }
            return next
        })
    }, [])

    const isRead = useCallback((id) => readIds.has(id), [readIds])

    return { isRead, markRead }
}
