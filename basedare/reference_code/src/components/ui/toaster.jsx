import * as React from "react"
import { Toast } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div 
      className="toast-container fixed left-1/2 -translate-x-1/2 flex flex-col gap-2 p-4"
      style={{
        top: '5.5rem',
        zIndex: 9999,
        maxWidth: '92vw',
        width: 'auto',
        minWidth: '320px'
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