// Example only — do not import. Copy when creating a NEW table.
// Keeps DataTable.tsx unchanged per request ("no need replace").
//
// V9 rules:
// - headless UI only (semantic <table>)
// - stable `tableFeatures` with only needed plugins / rowModels / fns
// - TanStack Store-backed state via `table.state` + `table.Subscribe` / selectors
// - external atoms only for URL/server-synced slices

import { createTableHook } from '@tanstack/react-table'
import {
  tableFeatures,
  // import only what product needs — keep stable object minimal:
  rowPaginationFeature,
  rowSortingFeature,
  columnFilteringFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  createFilteredRowModel,
} from '@tanstack/table-core'
import { atom } from '@tanstack/store'

// 1. Stable features — define once, outside component
export const appTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  columnFilteringFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  // add sortFns/filterFns only if product needs custom ones
})

// 2. Optional external atoms — only slices app must own (e.g. URL-synced pagination)
//    Otherwise let table own state internally via Store.
export const paginationAtom = atom({ pageIndex: 0, pageSize: 20 })

// 3. Hook factory — reuse across new tables
export const {
  useAppTable,
  createAppColumnHelper,
  useTableContext,
} = createTableHook({
  features: appTableFeatures,
  // tableComponents / cellComponents / headerComponents here if shared
})

// 4. Usage — new table only:
/*
import { useAppTable, createAppColumnHelper } from '@/components/tables/DataGridV9.example'

type Person = { id: string; name: string; age: number }
const helper = createAppColumnHelper<Person>()
const columns = [
  helper.accessor('name', { header: 'Name' }),
  helper.accessor('age', { header: 'Age' }),
]

function NewGrid({ data }: { data: Person[] }) {
  const table = useAppTable(
    {
      data,
      columns,
      // sync to URL/server only where product needs it:
      // state: { pagination: paginationAtom.get() },
      // onPaginationChange: (updater) => paginationAtom.setState(updater),
    },
    // selector for shallow, targeted re-renders — prefer Subscribe lower
    (s) => ({ pagination: s.pagination, sorting: s.sorting })
  )

  return (
    <table.AppTable>
      <table>
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <table.AppHeader key={h.id} header={h}>
                  {(header) => <th><header.FlexRender /></th>}
                </table.AppHeader>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <table.AppCell key={cell.id} cell={cell}>
                  {(c) => <td><c.FlexRender /></td>}
                </table.AppCell>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      // reactive reads — isolated, not whole table:
      <table.Subscribe selector={(s) => s.pagination}>
        {(pagination) => <span>Page {pagination.pageIndex + 1}</span>}
      </table.Subscribe>
    </table.AppTable>
  )
}
*/

// Existing DataTable.tsx remains in use for current admin tables.
export {}
