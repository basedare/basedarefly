"use client";

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToastProps {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  className?: string
  onClose?: (id: string) => void
  variant?: "default" | "destructive" | "success"
  txHash?: string | null
}

export function Toast({ 
  id, 
  title, 
  description, 
  className, 
  onClose, 
  variant = "default", 
  txHash = null 
}: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true)

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      if (onClose) onClose(id)
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-4 pr-10 backdrop-blur-xl animate-in slide-in-from-top-full transition-opacity duration-300",
        variant === "destructive" 
          ? "border-red-500/50 bg-red-500/10 text-white" 
          : "border-green-500/40 bg-[#10b981]/15 text-white",
        className
      )}
      style={{
        zIndex: 9999,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.2)',
        borderRadius: '12px'
      }}
    >
      <div className="grid gap-1 flex-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && (
          <div className="text-sm opacity-90">{description}</div>
        )}
        {txHash && (
          <a 
            href={`https://basescan.org/tx/${txHash}`} // Updated to BaseScan for Base chain
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 underline mt-1"
          >
            View Tx →
          </a>
        )}
      </div>
      <button
        onClick={handleClose}
        className="absolute right-2 top-2 rounded-md p-1 text-white/50 opacity-70 transition-opacity hover:text-white hover:opacity-100 focus:opacity-100 focus:outline-none"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
