'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format, parseISO } from 'date-fns'
import {
  ChevronDown, ChevronRight, Check, Flame, Target, Trash2, Calendar,
  TrendingUp, TrendingDown, Minus, Clock, Plus, Pencil, X, Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/providers/toast-provider'
import type { GoalNode, GoalCompletionCounts, GoalPeriod } from '@/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa']
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAY_COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#6366f1','#14b8a6']

interface GoalTreeCardProps { goal: GoalNode; onDeleted?: () => void }

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMomentum(node: GoalNode, completedCount: number): 'on-track'|'ahead'|'behind'|'complete'|'upcoming' {
  const period = node.period
  if (!period?.dateRange) return 'on-track'
  const now = new Date()
  const start = parseISO(period.dateRange.start as unknown as string)
  const end = parseISO(period.dateRange.end as unknown as string)
  if (now < start) return 'upcoming'
  const totalDuration = end.getTime() - start.getTime()
  const elapsed = Math.min(now.getTime() - start.getTime(), totalDuration)
  const expectedPct = elapsed / totalDuration
  const actualPct = node.targetCount > 0 ? completedCount / node.targetCount : 0
  if (actualPct >= 1) return 'complete'
  if (actualPct >= expectedPct + 0.1) return 'ahead'
  if (actualPct < expectedPct - 0.1) return 'behind'
  return 'on-track'
}

function MomentumBadge({ momentum }: { momentum: ReturnType<typeof getMomentum> }) {
  const config = {
    'on-track': { label: 'On Track', icon: <Minus className="w-3 h-3" />, cls: 'bg-blue-100 text-blue-700' },
    ahead:      { label: 'Ahead',    icon: <TrendingUp className="w-3 h-3" />, cls: 'bg-emerald-100 text-emerald-700' },
    behind:     { label: 'Behind',   icon: <TrendingDown className="w-3 h-3" />, cls: 'bg-rose-100 text-rose-700' },
    complete:   { label: 'Complete ✨', icon: <Check className="w-3 h-3" />, cls: 'bg-violet-100 text-violet-700' },
    upcoming:   { label: 'Upcoming', icon: <Clock className="w-3 h-3" />, cls: 'bg-gray-100 text-gray-500' },
  }
  const c = config[momentum]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  )
}

function ProgressBar({ pct, color = 'violet' }: { pct: number; color?: string }) {
  const map: Record<string,string> = { violet:'bg-violet-500', purple:'bg-purple-500', indigo:'bg-indigo-400', emerald:'bg-emerald-500', rose:'bg-rose-400' }
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ease-out ${map[color]??'bg-violet-500'}`}
        style={{ width:`${Math.min(100,Math.round(pct*100))}%` }} />
    </div>
  )
}

function getWeekRange(period?: GoalPeriod | null) {
  if (period?.dateRange?.start && period?.dateRange?.end) {
    return {
      start: parseISO(period.dateRange.start as unknown as string),
      end: parseISO(period.dateRange.end as unknown as string),
    }
  }

  if (!period?.year || !period?.month || !period?.weekOfMonth) return null

  const firstOfMonth = new Date(period.year, period.month - 1, 1)
  const firstDayDow = firstOfMonth.getDay()
  const week1Monday = firstDayDow === 1
    ? firstOfMonth
    : new Date(period.year, period.month - 1, 1 + ((8 - firstDayDow) % 7))

  const weekStart = new Date(week1Monday)
  weekStart.setDate(week1Monday.getDate() + (period.weekOfMonth - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return { start: weekStart, end: weekEnd }
}

// ─── Inline edit hook ───────────────────────────────────────────────────────

function useInlineEdit(id: string, field: 'name'|'description', initial: string, onSaved: ()=>void) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(initial)
  const { error } = useToast()

  const save = async () => {
    try {
      await api.put(`/habits/${id}`, { [field]: val.trim() || initial })
      onSaved()
      setEditing(false)
    } catch (e: any) {
      error('Save failed', e.response?.data?.error || e.message)
    }
  }
  const cancel = () => { setVal(initial); setEditing(false) }

  return { editing, val, setVal, setEditing, save, cancel }
}

// ─── Add Day Task inline form ───────────────────────────────────────────────

function AddDayTaskForm({ weekId, yearMonth, weekOfMonth, weekRange, onAdded, onCancel }: {
  weekId: string
  yearMonth: { year: number; month: number }
  weekOfMonth: number
  weekRange: { start: Date; end: Date }
  onAdded: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [date, setDate] = useState(format(weekRange.start, 'yyyy-MM-dd'))
  const [dailyTarget, setDailyTarget] = useState(1)
  const [saving, setSaving] = useState(false)
  const { error } = useToast()

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const selectedDate = new Date(`${date}T12:00:00.000Z`)
      await api.post('/habits', {
        name: name.trim(), goalType: 'daily', targetCount: dailyTarget,
        level: 'day', parentId: weekId,
        period: {
          year: yearMonth.year,
          month: yearMonth.month,
          weekOfMonth,
          date: selectedDate.toISOString(),
          daysOfWeek: [selectedDate.getUTCDay()],
        },
      })
      onAdded()
    } catch (e: any) {
      error('Failed to add task', e.response?.data?.error || e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-indigo-50 rounded-lg p-2.5 space-y-2 border border-indigo-200">
      <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Task name…" className="h-7 text-sm" autoFocus />
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Specific day</label>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            min={format(weekRange.start, 'yyyy-MM-dd')}
            max={format(weekRange.end, 'yyyy-MM-dd')}
            value={date}
            onChange={e => setDate(e.target.value)}
            className="h-7 text-sm flex-1"
          />
          <span className="text-[10px] text-gray-500 whitespace-nowrap">
            {date ? format(new Date(`${date}T12:00:00.000Z`), 'EEE') : 'Pick a day'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-auto justify-end">
        <button type="button" onClick={()=>setDailyTarget(t=>Math.max(1,t-1))} className="w-6 h-6 rounded border border-gray-300 text-xs flex items-center justify-center hover:bg-gray-100">−</button>
        <span className="text-xs font-bold w-4 text-center">{dailyTarget}</span>
        <button type="button" onClick={()=>setDailyTarget(t=>Math.min(20,t+1))} className="w-6 h-6 rounded border border-gray-300 text-xs flex items-center justify-center hover:bg-gray-100">+</button>
        <span className="text-[10px] text-gray-400">×/day</span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving||!name.trim()} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex-1">
          {saving?'Saving…':'Add Task'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-7 text-xs">Cancel</Button>
      </div>
    </div>
  )
}

// ─── Day Task Row ───────────────────────────────────────────────────────────

function DayTaskRow({ task, streak, completedToday, onComplete, onDelete, onSaved }: {
  task: GoalNode; streak: { currentStreak: number; longestStreak: number } | undefined;
  completedToday: boolean; onComplete:(id:string)=>void; onDelete:(id:string)=>void; onSaved:()=>void
}) {
  const dayLabel = task.period?.date
    ? format(new Date(task.period.date as string), 'MMM d')
    : null
  const days = task.period?.daysOfWeek ?? []
  const nameEdit = useInlineEdit(task.id, 'name', task.name, onSaved)

  return (
    <div className="flex items-center gap-2 py-2 pl-3 pr-2 hover:bg-gray-50 rounded-lg transition-colors group">
      <button onClick={()=>!completedToday && onComplete(task.id)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${completedToday?'border-emerald-400 bg-emerald-400':'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50'}`}>
        {completedToday && <Check className="w-3 h-3 text-white" />}
        {!completedToday && <Check className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-60" />}
      </button>

      <div className="flex-1 min-w-0">
        {nameEdit.editing ? (
          <div className="flex items-center gap-1">
            <Input value={nameEdit.val} onChange={e=>nameEdit.setVal(e.target.value)} className="h-6 text-xs flex-1" autoFocus
              onKeyDown={e=>{if(e.key==='Enter')nameEdit.save();if(e.key==='Escape')nameEdit.cancel()}} />
            <button onClick={nameEdit.save} className="text-emerald-500 hover:text-emerald-700"><Save className="w-3.5 h-3.5"/></button>
            <button onClick={nameEdit.cancel} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5"/></button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={`text-sm truncate ${completedToday?'line-through text-gray-400':'text-gray-700'}`}>{task.name}</span>
            <button onClick={()=>nameEdit.setEditing(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 flex-shrink-0">
              <Pencil className="w-3 h-3"/>
            </button>
          </div>
        )}
      </div>

      {streak && streak.currentStreak > 0 && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Flame className="w-3 h-3 text-orange-400"/>
          <span className="text-[10px] font-semibold text-orange-500">{streak.currentStreak}</span>
        </div>
      )}

      {dayLabel && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 flex-shrink-0">
          {dayLabel}
        </span>
      )}

      {!dayLabel && days.length > 0 && (
        <div className="flex gap-0.5 flex-shrink-0">
          {days.map(d=>(
            <span key={d} className="text-[10px] font-medium px-1 py-0.5 rounded bg-indigo-50 text-indigo-600">{DAY_SHORT[d]}</span>
          ))}
        </div>
      )}

      <span className="text-xs text-gray-400 flex-shrink-0">{task.targetCount}×</span>

      <button onClick={()=>onDelete(task.id)} className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 flex-shrink-0">
        <Trash2 className="w-3 h-3"/>
      </button>
    </div>
  )
}

function weeksInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  return Math.ceil((daysInMonth + ((firstDay + 6) % 7)) / 7)
}

function AddWeekForm({ goal, weekOfMonth: initialWeekOfMonth, occupiedWeeks, onAdded, onCancel }: {
  goal: GoalNode
  weekOfMonth: number
  occupiedWeeks: number[]
  onAdded: () => void
  onCancel: () => void
}) {
  const [weekOfMonth, setWeekOfMonth] = useState(initialWeekOfMonth)
  const [name, setName] = useState(`Week ${initialWeekOfMonth}`)
  const [description, setDescription] = useState('')
  const [targetCount, setTargetCount] = useState(3)
  const [saving, setSaving] = useState(false)
  const { error } = useToast()
  const queryClient = useQueryClient()

  const year = goal.period?.year ?? new Date().getFullYear()
  const month = goal.period?.month ?? new Date().getMonth() + 1
  const maxWeeks = weeksInMonth(year, month)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.post('/habits', {
        name: name.trim(),
        description: description.trim() || undefined,
        goalType: 'weekly',
        targetCount,
        level: 'week',
        parentId: goal.id,
        period: { year, month, weekOfMonth },
      })
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goal-counts', goal.id] })
      onAdded()
    } catch (e: any) {
      error('Failed to add week', e.response?.data?.error || e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-violet-200 bg-violet-50/70 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">Add another week</p>
          <p className="text-xs text-gray-500">Creates a new week under this month goal.</p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
          Week {weekOfMonth} / {maxWeeks}
        </span>
      </div>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Week name…" className="h-8 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={weekOfMonth}
          onChange={e => setWeekOfMonth(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
        >
          {Array.from({ length: maxWeeks }, (_, i) => i + 1).map(weekNum => (
              <option key={weekNum} value={weekNum} disabled={occupiedWeeks.includes(weekNum) && weekNum !== weekOfMonth}>
                Week {weekNum}
              </option>
            ))}
        </select>
        <Input
          type="number"
          min={1}
          max={100}
          value={targetCount}
          onChange={e => setTargetCount(Math.max(1, Number(e.target.value) || 1))}
          className="h-10 text-sm"
        />
      </div>
      <Textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        placeholder="Optional week description..."
        className="text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving || !name.trim()} className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white flex-1">
          {saving ? 'Saving…' : 'Add Week'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-8 text-xs">
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Week Card ──────────────────────────────────────────────────────────────

function WeekCard({ week, weekIndex, counts, streaks, todayCompletedIds, onComplete, onDelete, onSaved }: {
  week: GoalNode; weekIndex: number;
  counts: Record<string,number>; streaks: Record<string,{currentStreak:number;longestStreak:number}>;
  todayCompletedIds: Set<string>;
  onComplete:(id:string)=>void; onDelete:(id:string)=>void; onSaved:()=>void
}) {
  const [expanded, setExpanded] = useState(true)
  const [addingTask, setAddingTask] = useState(false)
  const queryClient = useQueryClient()

  const completedCount = counts[week.id] ?? 0
  const pct = week.targetCount > 0 ? completedCount / week.targetCount : 0
  const momentum = getMomentum(week, completedCount)
  const nameEdit = useInlineEdit(week.id, 'name', week.name, onSaved)
  const weekRange = getWeekRange(week.period) ?? {
    start: new Date(),
    end: new Date(),
  }

  const deleteDayMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/habits/${id}`) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); onSaved() },
  })

  const weekColors = [
    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    'linear-gradient(135deg,#6366f1,#4f46e5)',
    'linear-gradient(135deg,#ec4899,#db2777)',
    'linear-gradient(135deg,#14b8a6,#0d9488)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
  ]

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
      <button onClick={()=>setExpanded(e=>!e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0"/> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0"/>}
        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: weekColors[weekIndex % weekColors.length] }}>
          <span className="text-white text-[10px] font-bold">{weekIndex+1}</span>
        </div>
        <div className="flex-1 min-w-0">
          {nameEdit.editing ? (
            <div className="flex items-center gap-1" onClick={e=>e.stopPropagation()}>
              <Input value={nameEdit.val} onChange={e=>nameEdit.setVal(e.target.value)} className="h-6 text-sm flex-1" autoFocus
                onKeyDown={e=>{if(e.key==='Enter')nameEdit.save();if(e.key==='Escape')nameEdit.cancel()}} />
              <button onClick={nameEdit.save} className="text-emerald-500 hover:text-emerald-700"><Save className="w-3.5 h-3.5"/></button>
              <button onClick={nameEdit.cancel} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5"/></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group/wname">
              <span className="text-sm font-medium text-gray-900 truncate">{week.name}</span>
              <button onClick={e=>{e.stopPropagation();nameEdit.setEditing(true)}}
                className="opacity-0 group-hover/wname:opacity-100 text-gray-400 hover:text-gray-600 flex-shrink-0">
                <Pencil className="w-3 h-3"/>
              </button>
            </div>
          )}
          {week.period?.dateRange && (
            <div className="text-xs text-gray-400">
              {format(parseISO(week.period.dateRange.start as unknown as string),'MMM d')} – {format(parseISO(week.period.dateRange.end as unknown as string),'MMM d')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <MomentumBadge momentum={momentum}/>
          <span className="text-xs text-gray-500 w-16 text-right">{completedCount}/{week.targetCount}</span>
        </div>
      </button>

      <div className="px-4 pb-2"><ProgressBar pct={pct} color="indigo"/></div>

      {expanded && (
        <div className="px-2 pb-2 space-y-0.5">
          {week.children.map(task=>(
            <DayTaskRow key={task.id} task={task}
              streak={streaks[task.id]} completedToday={todayCompletedIds.has(task.id)}
              onComplete={onComplete} onDelete={id=>deleteDayMutation.mutate(id)} onSaved={onSaved}/>
          ))}

          {addingTask ? (
            <div className="px-1 pt-1">
              <AddDayTaskForm weekId={week.id}
                yearMonth={{ year: week.period?.year ?? new Date().getFullYear(), month: week.period?.month ?? new Date().getMonth()+1 }}
                weekOfMonth={week.period?.weekOfMonth ?? 1}
                weekRange={weekRange}
                onAdded={()=>{ setAddingTask(false); queryClient.invalidateQueries({ queryKey: ['goals'] }) }}
                onCancel={()=>setAddingTask(false)}/>
            </div>
          ) : (
            <button onClick={()=>setAddingTask(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-indigo-200 text-indigo-400 hover:bg-indigo-50 text-xs font-medium transition-colors mt-1">
              <Plus className="w-3 h-3"/> Add Day Task
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main GoalTreeCard ───────────────────────────────────────────────────────

export function GoalTreeCard({ goal, onDeleted }: GoalTreeCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [addingWeek, setAddingWeek] = useState(false)
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  // Fetch live completion counts + streaks for the whole subtree
  const { data: completionData, refetch: refetchCounts } = useQuery<GoalCompletionCounts>({
    queryKey: ['goal-counts', goal.id],
    queryFn: async () => {
      const r = await api.get(`/habits/${goal.id}/completion-counts`)
      return r.data.data
    },
    refetchInterval: 30_000,
  })

  // Fetch today's completions (to mark which day tasks are done today)
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayStart = `${today}T00:00:00.000Z`
  const todayEnd = `${today}T23:59:59.999Z`
  const { data: todayCompletions } = useQuery<string[]>({
    queryKey: ['today-completions', goal.id, today],
    queryFn: async () => {
      const r = await api.get('/completions/range', { params: { startDate: todayStart, endDate: todayEnd } })
      const data: any[] = r.data.data || []
      return data.map(c => c.habitId)
    },
  })

  const todayCompletedIds = new Set<string>(todayCompletions ?? [])

  const counts = completionData?.counts ?? {}
  const streaks = completionData?.streaks ?? {}

  const completeTaskMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const r = await api.post('/completions', { habitId, date: today })
      return r.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['today-completions', goal.id, today] })
      queryClient.invalidateQueries({ queryKey: ['goal-counts', goal.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      success('✅ Marked complete!', 'Keep going!')
    },
    onError: (err: any) => {
      const code = err.response?.data?.code
      if (code === 'DUPLICATE_COMPLETION') { success('Already done!', 'You already logged this today.'); return }
      error('Could not mark complete', err.response?.data?.error || err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { await api.delete(`/habits/${goal.id}`) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      success('Deleted', `"${goal.name}" and all sub-goals removed.`)
      onDeleted?.()
    },
  })

  const handleDelete = () => {
    if (window.confirm(`Delete "${goal.name}" and all its week/day tasks? This cannot be undone.`)) deleteMutation.mutate()
  }

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['goals'] })
    refetchCounts()
  }

  const totalCount = counts[goal.id] ?? 0
  const overallPct = goal.targetCount > 0 ? totalCount / goal.targetCount : 0
  const momentum = getMomentum(goal, totalCount)
  const weekCount = goal.children.length
  const totalDayTasks = goal.children.reduce((s,w)=>s+w.children.length, 0)
  const periodLabel = goal.period ? `${MONTHS[(goal.period.month??1)-1]} ${goal.period.year}` : null
  const year = goal.period?.year ?? new Date().getFullYear()
  const month = goal.period?.month ?? new Date().getMonth() + 1
  const maxWeeks = weeksInMonth(year, month)
  const existingWeekNumbers = new Set(goal.children.map(week => week.period?.weekOfMonth).filter((week): week is number => typeof week === 'number'))
  const nextWeekOfMonth = Array.from({ length: maxWeeks }, (_, i) => i + 1).find(weekNum => !existingWeekNumbers.has(weekNum))

  return (
    <div className={`rounded-2xl border-2 overflow-hidden shadow-sm transition-all duration-200 ${
      momentum==='complete'?'border-violet-300 bg-violet-50/30':momentum==='behind'?'border-rose-200 bg-rose-50/20':'border-gray-200 bg-white'
    }`}>
      {/* Month Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button onClick={()=>setExpanded(e=>!e)}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0">
              {expanded ? <ChevronDown className="w-4 h-4 text-white"/> : <ChevronRight className="w-4 h-4 text-white"/>}
            </button>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{goal.name}</h3>
              {periodLabel && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3 h-3 text-violet-200"/>
                  <span className="text-violet-200 text-xs">{periodLabel}</span>
                  <span className="text-violet-300 text-xs">·</span>
                  <span className="text-violet-200 text-xs">{weekCount} weeks · {totalDayTasks} day tasks</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MomentumBadge momentum={momentum}/>
            <button onClick={handleDelete} disabled={deleteMutation.isPending}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-400/40 flex items-center justify-center transition-colors text-white/70 hover:text-white">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>

        {/* Overall progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-violet-200 mb-1.5">
            <span>Overall progress</span>
            <span>{Math.round(overallPct*100)}% · {totalCount}/{goal.targetCount}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700 ease-out"
              style={{ width:`${Math.min(100,Math.round(overallPct*100))}%` }}/>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label:'Weeks', val: weekCount },
            { label:'Day Tasks', val: totalDayTasks },
            { label:'Done Today', val: goal.children.flatMap(w=>w.children).filter(d=>todayCompletedIds.has(d.id)).length },
          ].map(s=>(
            <div key={s.label} className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
              <div className="text-white font-bold text-sm">{s.val}</div>
              <div className="text-violet-200 text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Week goals */}
      {expanded && (
        <div className="p-4 space-y-3">
          {nextWeekOfMonth && !addingWeek && goal.children.length > 0 && (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setAddingWeek(true)}
                className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3" />
                Add Week
              </Button>
            </div>
          )}

          {addingWeek && nextWeekOfMonth && (
            <AddWeekForm
              goal={goal}
              weekOfMonth={nextWeekOfMonth}
              occupiedWeeks={Array.from(existingWeekNumbers)}
              onAdded={() => setAddingWeek(false)}
              onCancel={() => setAddingWeek(false)}
            />
          )}

          {goal.children.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30"/>
              <p>No week goals yet.</p>
              <p className="text-xs mt-1">Use the Add Week button to create the first one.</p>
              {nextWeekOfMonth && !addingWeek && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAddingWeek(true)}
                  className="mt-4 h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Week
                </Button>
              )}
            </div>
          ) : (
            goal.children.map((week,i)=>(
              <WeekCard key={week.id} week={week} weekIndex={i}
                counts={counts} streaks={streaks} todayCompletedIds={todayCompletedIds}
                onComplete={id=>completeTaskMutation.mutate(id)}
                onDelete={id=>{
                  if (window.confirm(`Delete this week and all its day tasks?`)) {
                    api.delete(`/habits/${id}`).then(()=>{
                      queryClient.invalidateQueries({ queryKey: ['goals'] })
                    })
                  }
                }}
                onSaved={handleSaved}/>
            ))
          )}
        </div>
      )}
    </div>
  )
}
