export default function Card({ children, className = '', hover, glow }) {
  return (
    <div className={`
      card p-5
      ${hover ? 'hover:border-blue-primary/30 hover:bg-navy-700 transition-all duration-200 cursor-pointer' : ''}
      ${glow ? 'ring-1 ring-blue-primary/20 shadow-lg shadow-blue-primary/5' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}