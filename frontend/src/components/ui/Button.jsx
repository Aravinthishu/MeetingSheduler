// src/components/ui/Button.jsx
const variants = {
  primary: 'bg-[#388add] hover:bg-[#2a6bb0] text-white border-[#388add] dark:bg-blue-dark dark:hover:bg-blue-primary dark:text-blue-lighter dark:border-blue-dark/50',
  ghost: 'bg-transparent hover:bg-[#f7fafc] text-[#4a5568] hover:text-[#1a202c] border-[#e2e8f0] dark:bg-transparent dark:hover:bg-white/5 dark:text-white/70 dark:hover:text-white dark:border-white/10',
  danger: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 dark:border-red-500/20',
  success: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:hover:bg-green-500/20 dark:text-green-400 dark:border-green-500/20',
  amber: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/20',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export default function Button({
  children, variant = 'primary', size = 'md',
  loading, icon: Icon, className = '', ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center gap-2 font-medium rounded-lg border
        transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon size={14} />
      ) : null}
      {children}
    </button>
  )
}