'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/dashboard/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/dashboard/ui/select'
import { DataTable } from '@/components/dashboard/data-table/data-table'
import { DataTableToolbar } from '@/components/dashboard/data-table/data-table-toolbar'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { STAGES, VENUES, GROUPS, MATCH_STATUSES } from '@/lib/dashboard/match-options'
import { matchColumns } from './columns'
import { MatchDrawer } from './match-drawer'
import type { Match } from '@/payload-types'
import type { DataTableQueryParams, DataTableResult } from '@/components/dashboard/data-table/types'

const ALL = '__all__'

async function fetchMatches(params: DataTableQueryParams): Promise<DataTableResult<Match>> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  })
  if (params.sort) {
    search.set('sortId', params.sort.id)
    search.set('sortDesc', String(params.sort.desc))
  }
  for (const [key, value] of Object.entries(params.filters)) {
    if (value) search.set(key, value)
  }
  return dashboardFetch<DataTableResult<Match>>(`/api/dashboard/matches?${search.toString()}`)
}

export function MatchesTable({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [group, setGroup] = useState(ALL)
  const [venue, setVenue] = useState(ALL)
  const [drawerMatchId, setDrawerMatchId] = useState<number | 'new' | null>(null)

  const filters: Record<string, string> = {
    q: search,
    stage: stage === ALL ? '' : stage,
    status: status === ALL ? '' : status,
    group: group === ALL ? '' : group,
    venue: venue === ALL ? '' : venue,
  }

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search fixtures…"
          filters={
            <>
              <FilterSelect label="Stage" value={stage} onChange={setStage} options={STAGES} />
              <FilterSelect label="Status" value={status} onChange={setStatus} options={MATCH_STATUSES} />
              <FilterSelect label="Group" value={group} onChange={setGroup} options={GROUPS} />
              <FilterSelect label="Venue" value={venue} onChange={setVenue} options={VENUES} />
            </>
          }
          actions={
            canManage && (
              <Button size="sm" onClick={() => setDrawerMatchId('new')}>
                <Plus className="size-4" />
                New match
              </Button>
            )
          }
        />
      </div>

      <DataTable
        columns={matchColumns}
        queryKey={['matches']}
        fetcher={fetchMatches}
        filters={filters}
        defaultSort={{ id: 'kickoff', desc: false }}
        pageSize={20}
        getRowId={(row) => String(row.id)}
        onRowClick={(row) => setDrawerMatchId(row.id)}
        emptyState={{ title: 'No fixtures match these filters', description: 'Try clearing a filter or search term.' }}
      />

      <MatchDrawer
        matchId={drawerMatchId}
        canManage={canManage}
        onClose={() => setDrawerMatchId(null)}
      />
    </div>
  )
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly { label: string; value: T }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-32">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
