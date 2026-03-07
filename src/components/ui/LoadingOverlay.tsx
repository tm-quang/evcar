import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface LoadingOverlayProps {
    isOpen: boolean
    text?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isOpen }) => {
    const [show, setShow] = useState(false)
    const [render, setRender] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setRender(true)
            const timer = setTimeout(() => setShow(true), 10)
            return () => clearTimeout(timer)
        } else {
            setShow(false)
            const timer = setTimeout(() => setRender(false), 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    if (!render) return null

    // Use portal to render at the top level
    return createPortal(
        <div
            className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'
                }`}
        >
            {/* The 5 dots animation */}
            <div className="relative z-10 flex items-center justify-center gap-3">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="w-3.5 h-3.5 rounded-full bg-sky-400 loading-dot-wave shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>

            {/* text removed per user request */}
        </div>,
        document.body
    )
}
