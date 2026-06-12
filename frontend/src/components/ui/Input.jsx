export default function Input({ label, error, icon: Icon, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
            <Icon size={14} />
          </div>
        )}
        <input
          className={`input-base ${Icon ? 'pl-9' : ''} ${error ? 'border-red-500/50 focus:border-red-500/80' : ''}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}