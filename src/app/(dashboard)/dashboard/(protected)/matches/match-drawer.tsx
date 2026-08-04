'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/dashboard/ui/sheet'
import { Button } from '@/components/dashboard/ui/button'
import { Input } from '@/components/dashboard/ui/input'
import { Checkbox } from '@/components/dashboard/ui/checkbox'
import { Label } from '@/components/dashboard/ui/label'
import { Separator } from '@/components/dashboard/ui/separator'
import { Skeleton } from '@/components/dashboard/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/dashboard/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/dashboard/ui/form'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { isoToKigaliLocal, kigaliLocalToISO } from '@/lib/dashboard/kigali-time'
import { STAGES, VENUES, GROUPS, MATCH_STATUSES } from '@/lib/dashboard/match-options'
import { matchSchema, scoreEntryVisible, type MatchFormValues } from './match-schema'
import { BulkPhotoUpload } from './bulk-photo-upload'
import { EmbedCodePanel } from './embed-code-panel'
import { CommentaryPhotosLinks } from './commentary-photos-links'
import type { Match, Team } from '@/payload-types'

const NONE = '__none__'

const EMPTY_VALUES: MatchFormValues = {
  matchNumber: 1,
  stage: 'group',
  group: undefined,
  homeTeam: undefined,
  awayTeam: undefined,
  homeTeamPlaceholder: '',
  awayTeamPlaceholder: '',
  venue: 'amahoro',
  kickoff: '',
  status: 'scheduled',
  manualScore: false,
  homeScore: '',
  awayScore: '',
  liveMatchUrl: '',
  showLiveButton: true,
}

function toFormValues(match: Match): MatchFormValues {
  return {
    matchNumber: match.matchNumber,
    stage: match.stage,
    group: match.group ?? undefined,
    homeTeam: match.homeTeam ? String(typeof match.homeTeam === 'object' ? match.homeTeam.id : match.homeTeam) : undefined,
    awayTeam: match.awayTeam ? String(typeof match.awayTeam === 'object' ? match.awayTeam.id : match.awayTeam) : undefined,
    homeTeamPlaceholder: match.homeTeamPlaceholder ?? '',
    awayTeamPlaceholder: match.awayTeamPlaceholder ?? '',
    venue: match.venue,
    kickoff: isoToKigaliLocal(match.kickoff),
    status: match.status,
    manualScore: Boolean(match.manualScore),
    homeScore: match.homeScore ?? '',
    awayScore: match.awayScore ?? '',
    liveMatchUrl: match.liveMatchUrl ?? '',
    showLiveButton: match.showLiveButton ?? true,
  }
}

export function MatchDrawer({
  matchId,
  canManage,
  onClose,
}: {
  matchId: number | 'new' | null
  canManage: boolean
  onClose: () => void
}) {
  const open = matchId !== null
  const isNew = matchId === 'new'
  const queryClient = useQueryClient()

  const { data: match, isLoading } = useQuery({
    queryKey: ['matches', matchId],
    queryFn: () => dashboardFetch<Match>(`/api/dashboard/matches/${matchId}`),
    enabled: typeof matchId === 'number',
  })

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => dashboardFetch<{ rows: Pick<Team, 'id' | 'name' | 'shortName' | 'group'>[] }>('/api/dashboard/teams'),
    enabled: open,
  })
  const teams = teamsData?.rows ?? []

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (!open) return
    if (isNew) form.reset(EMPTY_VALUES)
    else if (match) form.reset(toFormValues(match))
  }, [open, isNew, match, form])

  const status = form.watch('status')
  const kickoff = form.watch('kickoff')
  const showScoreFields = scoreEntryVisible(status, kickoff)

  const saveMutation = useMutation({
    mutationFn: async (values: MatchFormValues) => {
      const data = {
        matchNumber: values.matchNumber,
        stage: values.stage,
        group: values.stage === 'group' ? (values.group || null) : null,
        homeTeam: values.homeTeam ? Number(values.homeTeam) : null,
        awayTeam: values.awayTeam ? Number(values.awayTeam) : null,
        homeTeamPlaceholder: values.homeTeamPlaceholder || null,
        awayTeamPlaceholder: values.awayTeamPlaceholder || null,
        venue: values.venue,
        kickoff: kigaliLocalToISO(values.kickoff),
        status: values.status,
        manualScore: values.manualScore,
        homeScore: values.homeScore === '' ? null : Number(values.homeScore),
        awayScore: values.awayScore === '' ? null : Number(values.awayScore),
        liveMatchUrl: values.liveMatchUrl || null,
        showLiveButton: values.showLiveButton,
      }
      if (isNew) {
        return dashboardFetch<Match>('/api/dashboard/matches', { method: 'POST', body: JSON.stringify(data) })
      }
      return dashboardFetch<Match>(`/api/dashboard/matches/${matchId}`, { method: 'PATCH', body: JSON.stringify(data) })
    },
    onSuccess: () => {
      toast.success(isNew ? 'Match created.' : 'Match updated.')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save the match.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => dashboardFetch(`/api/dashboard/matches/${matchId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Match deleted.')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete the match.'),
  })

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isNew ? 'New match' : match ? match.label : 'Match'}</SheetTitle>
          <SheetDescription>
            {isNew ? 'Add a fixture to the tournament.' : 'Edit fixture details, status and scoreline.'}
          </SheetDescription>
        </SheetHeader>

        {!isNew && isLoading ? (
          <div className="grid gap-3 px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
              className="grid gap-4 px-4 pb-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="matchNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match number</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch('stage') === 'group' && (
                <FormField
                  control={form.control}
                  name="group"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group</FormLabel>
                      <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}>
                        <FormControl>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select group" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>None</SelectItem>
                          {GROUPS.map((g) => (
                            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="homeTeam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Home team</FormLabel>
                      <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}>
                        <FormControl>
                          <SelectTrigger className="w-full"><SelectValue placeholder="TBD" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>TBD (use placeholder)</SelectItem>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="awayTeam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Away team</FormLabel>
                      <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}>
                        <FormControl>
                          <SelectTrigger className="w-full"><SelectValue placeholder="TBD" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>TBD (use placeholder)</SelectItem>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="homeTeamPlaceholder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Home placeholder</FormLabel>
                      <FormControl><Input placeholder="e.g. Winner Gr. B" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="awayTeamPlaceholder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Away placeholder</FormLabel>
                      <FormControl><Input placeholder="e.g. Best Runner-Up" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="venue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VENUES.map((v) => (
                            <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kickoff"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kick-off (Kigali time)</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MATCH_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showScoreFields && (
                <>
                  <Separator />
                  <FormField
                    control={form.control}
                    name="manualScore"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Enter result manually (off = auto-filled from Live Commentary goals)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="homeScore"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Home score</FormLabel>
                          <FormControl><Input type="number" min={0} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="awayScore"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Away score</FormLabel>
                          <FormControl><Input type="number" min={0} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <Separator />

              <FormField
                control={form.control}
                name="liveMatchUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Live match URL (optional)</FormLabel>
                    <FormControl><Input placeholder="Defaults to this match's own page" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="showLiveButton"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Show header LIVE button once live</FormLabel>
                  </FormItem>
                )}
              />

              <SheetFooter className="flex-row justify-between px-0">
                {!isNew && canManage ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm('Delete this fixture? This cannot be undone.')) deleteMutation.mutate()
                    }}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : isNew ? 'Create match' : 'Save changes'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        )}

        {!isNew && match && (
          <div className="grid gap-4 border-t border-border px-4 py-4">
            <div>
              <Label className="mb-2 block text-sm font-medium">Match photos</Label>
              <BulkPhotoUpload matchId={match.id} />
            </div>
            <Separator />
            <div>
              <Label className="mb-2 block text-sm font-medium">Live Expressions embed</Label>
              <EmbedCodePanel matchId={match.id} />
            </div>
            <Separator />
            <CommentaryPhotosLinks matchId={match.id} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
