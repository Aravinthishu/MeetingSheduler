// Table.jsx - Enhanced for mobile
export default function Table({ columns, data, onRowClick, loading, emptyText = 'No data found' }) {
  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-blue-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[500px] sm:min-w-full">
        <thead>
          <tr className="border-b border-white/5">
            {columns.map(col => (
              <th
                key={col.key}
                className="text-left px-3 sm:px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!data?.length ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-white/30 text-sm">
                {emptyText}
              </td>
            </tr>
          ) : data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              className={`
                border-b border-white/5 transition-colors duration-150
                ${onRowClick ? 'cursor-pointer hover:bg-white/3' : ''}
              `}
            >
              {columns.map(col => (
                <td key={col.key} className="px-3 sm:px-4 py-3 text-white/80">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}