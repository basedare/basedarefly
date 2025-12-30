"use client";

import * as React from "react"
import { Toast } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 flex flex-col gap-2 p-4 w-full md:w-auto md:min-w-[320px] max-w-[92vw]"
      style={{
        top: '5.5rem', // Positioned below the navbar
        zIndex: 9999,
      }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          className={toast.className}
          variant={toast.variant}
          txHash={toast.txHash}
          onClose={dismiss}
        />
      ))}
    </div>
  )
}

