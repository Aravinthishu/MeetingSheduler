const variants = {
  primary: 'bg-blue-dark hover:bg-blue-primary text-blue-lighter border-blue-dark/50',
  ghost: 'bg-transparent hover:bg-white/5 text-white/70 hover:text-white border-white/10',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20',
  success: 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20',
  amber: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20',
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