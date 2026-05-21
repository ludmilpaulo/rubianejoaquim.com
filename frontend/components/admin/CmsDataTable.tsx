'use client'

export interface CmsColumn<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
}

export default function CmsDataTable<T extends { id: number }>({
  rows,
  columns,
  emptyMessage,
}: {
  rows: T[]
  columns: CmsColumn<T>[]
  emptyMessage?: string
}) {
  if (!rows.length) {
    return (
      <p className="text-slate-500 py-12 text-center bg-white rounded-xl border border-slate-200">
        {emptyMessage || 'No items yet. Add content in Django admin or via API.'}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-semibold">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/80">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-slate-800">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
