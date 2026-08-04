export interface DataTableSort {
  id: string
  desc: boolean
}

export interface DataTableQueryParams {
  page: number
  pageSize: number
  sort?: DataTableSort
  filters: Record<string, string>
}

export interface DataTableResult<TData> {
  rows: TData[]
  pageCount: number
  totalDocs: number
}
