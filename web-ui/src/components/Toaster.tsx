import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/utils/cn'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

const toastStore = {
  toasts: [] as Toast[],
  listeners: [] as (() => void)[],
  subscribe(listener: () => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  },
  notify() {
    this.listeners.forEach((l) => l())
  },
  addToast(toast: Toast) {
    this.toasts = [...this.toasts, toast]
    this.notify()
    setTimeout(() => this.removeToast(toast.id), 5000)
  },
  removeToast(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id)
    this.notify()
  },
}

export function toast(type: ToastType, message: string) {
  toastStore.addToast({
    id: Math.random().toString(36).substring(2),
    type,
    message,
  })
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return toastStore.subscribe(() => setToasts([...toastStore.toasts]))
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[280px] max-w-[400px]",
              toast.type === 'success' && "bg-green-500/10 border-green-500/20 text-green-600",
              toast.type === 'error' && "bg-destructive/10 border-destructive/20 text-destructive",
              toast.type === 'info' && "bg-primary/10 border-primary/20 text-primary"
            )}
          >
            <div className="flex-shrink-0"
    >
              {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => toastStore.removeToast(toast.id)}
              className="flex-shrink-0 p-1 rounded-md hover:bg-foreground/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
