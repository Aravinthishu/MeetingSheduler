// src/components/ui/Modal.jsx
import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm sm:max-w-md',
    md: 'max-w-md sm:max-w-lg',
    lg: 'max-w-lg sm:max-w-2xl',
    xl: 'max-w-xl sm:max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div 
        className={`
          relative bg-white border border-[#e2e8f0] rounded-t-2xl sm:rounded-2xl shadow-2xl 
          w-full ${sizes[size]} max-h-[90vh] overflow-hidden
          animate-slide-up sm:animate-fade-in
          dark:bg-navy-800 dark:border-white/10
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#e2e8f0] dark:border-white/8">
          <h3 className="text-base sm:text-lg font-semibold text-[#1a202c] dark:text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a0aec0] hover:text-[#1a202c] hover:bg-[#f7fafc] transition-all dark:text-white/40 dark:hover:text-white dark:hover:bg-white/8"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-70px)]">
          {children}
        </div>
      </div>
    </div>
  )
}