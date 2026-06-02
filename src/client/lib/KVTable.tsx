import type { ReactNode } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

export type KVRow = { label: string; value: ReactNode }

const columnHelper = createColumnHelper<KVRow>()

const COLUMNS = [
  columnHelper.accessor('label', {
    id: 'label',
    header: '',
    cell: info => info.getValue(),
  }),
  columnHelper.display({
    id: 'value',
    header: '',
    cell: ({ row }) => row.original.value,
  }),
]

/**
 * A two-column key/value table backed by TanStack Table.
 * Pass `size="xs"` for compact rows (used in "raw extras" details sections).
 */
export function KVTable({ rows, size = 'sm' }: { rows: KVRow[]; size?: 'xs' | 'sm' }) {
  const table = useReactTable({
    data: rows,
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
  })

  const py = size === 'xs' ? 'py-1' : 'py-1.5'
  const fs = size === 'xs' ? '0.75rem' : '0.875rem'

  return (
    <table className="w-full" style={{ fontSize: fs }}>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
            {row.getVisibleCells().map((cell, i) => (
              <td
                key={cell.id}
                className={i === 0 ? `${py} pr-4` : py}
                style={
                  i === 0
                    ? { color: 'var(--color-text-muted)', width: '55%' }
                    : { color: 'var(--color-text)', fontWeight: 500 }
                }
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
