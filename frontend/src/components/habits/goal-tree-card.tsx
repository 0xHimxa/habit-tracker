'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format, isWithinInterval, parseISO, isPast } from 'date-fns'
import {
  ChevronDown,
  ChevronRight,
  Check,
  Flame,
  Target,
  Trash2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/providers/toast-provider'
import type { GoalNode } from '@/types'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]
const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface GoalTreeCardProps {
  goal: GoalNode
  onDeleted?: () => void
}

// ---------------------------------------------------------------------------
// Momentum calculation
// ---------------------------------------------------------------------------

function getMomentum(node: GoalNode, completionCounts: Map<string, number>): 'on-track' | 'ahead' | 'behind' | 'complete' | 'upcoming' {
  const period = node.period
  if (!period?.dateRange) return 'on-track'

  const now = new Date()
  const start = parseISO(period.dateRange.start as unknown as string)
  const end = parseISO(period.dateRange.end as unknown as string)

  if (now < start) return 'upcoming'

  const totalDuration = end.getTime() - start.getTime()
  const elapsed = Math.min(now.getTime() - start.getTime(), totalDuration)
  const expectedPct = elapsed / totalDuration

  // Count completions across all day children
  let totalTarget = node.targetCount
  let completed = completionCounts.get(node.id) ?? 0

  const actualPct = totalTarget > 0 ? completed / totalTarget : 0

  if (actualPct >= 1) return 'complete'
  if (actualPct >= expectedPct + 0.1) return 'ahead'
  if (actualPct < expectedPct - 0.1) return 'behind'
  return 'on-track'
}

function MomentumBadge({ momentum }: { momentum: ReturnType<typeof getMomentum> }) {
  const config = {
    'on-track': { label: 'On Track', icon: <Minus className="w-3 h-3" />, cls: 'bg-blue-100 text-blue-700' },
    ahead: { label: 'Ahead', icon: <TrendingUp className="w-3 h-3" />, cls: 'bg-emerald-100 text-emerald-700' },
    behind: { label: 'Behind', icon: <TrendingDown className="w-3 h-3" />, cls: 'bg-rose-100 text-rose-700' },
    complete: { label: 'Complete ✨', icon: <Check className="w-3 h-3" />, cls: 'bg-violet-100 text-violet-700' },
    upcoming: { label: 'Upcoming', icon: <Clock className="w-3 h-3" />, cls: 'bg-gray-100 text-gray-500' },
  }
  const c = config[momentum]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.cls}`}>
      {c.icon}
      {c.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ pct, color = 'violet' }: { pct: number; color?: string }) {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-400',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-400',
  }
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${colorMap[color] ?? 'bg-violet-500'}`}
        style={{ width: `${Math.min(100, Math.round(pct * 100))}%` }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Day task row
// ---------------------------------------------------------------------------

function DayTaskRow({
  task,
  onComplete,
}: {
  task: GoalNode
  onComplete: (id: string) => void
}) {
  const days = task.period?.daysOfWeek ?? []
  return (
    <div className="flex items-center gap-3 py-2 pl-4 pr-3 hover:bg-gray-50 rounded-lg transition-colors group">
      <button
        onClick={() => onComplete(task.id)}
        className="w-5 h-5 rounded-full border-2 border-indigo-300 flex items-center justify-center flex-shrink-0 hover:border-indigo-500 hover:bg-indigo-50 transition-all"
      >
        <Check className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-60" />
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-700 truncate">{task.name}</span>
      </div>
      {days.length > 0 && (
        <div className="flex gap-1">
          {days.map(d => (
            <span key={d} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
              {DAY_SHORT[d]}
            </span>
          ))}
        </div>
      )}
      <span className="text-xs text-gray-400 ml-1">{task.targetCount}×</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Week card (inside month)
// ---------------------------------------------------------------------------

function WeekCard({
  week,
  weekIndex,
  completionCounts,
  onComplete,
}: {
  week: GoalNode
  weekIndex: number
  completionCounts: Map<string, number>
  onComplete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const momentum = getMomentum(week, completionCounts)
  const completedCount = completionCounts.get(week.id) ?? 0
  const pct = week.targetCount > 0 ? completedCount / week.targetCount : 0

  const weekColors = ['purple', 'indigo', 'violet', 'emerald', 'rose']
  const color = weekColors[weekIndex % weekColors.length]

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
      {/* Week header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}

        <div className={`w-6 h-6 rounded-md bg-gradient-to-br from-${color}-400 to-${color}-600 flex items-center justify-center flex-shrink-0`}
             style={{ background: weekIndex % 2 === 0 ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          <span className="text-white text-[10px] font-bold">{weekIndex + 1}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{week.name}</div>
          {week.period?.dateRange && (
            <div className="text-xs text-gray-400">
              {format(parseISO(week.period.dateRange.start as unknown as string), 'MMM d')} –{' '}
              {format(parseISO(week.period.dateRange.end as unknown as string), 'MMM d')}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <MomentumBadge momentum={momentum} />
          <div className="text-xs text-gray-500 w-16 text-right">
            {completedCount}/{week.targetCount}
          </div>
        </div>
      </button>

      {/* Progress */}
      <div className="px-4 pb-2">
        <ProgressBar pct={pct} color="indigo" />
      </div>

      {/* Day tasks */}
      {expanded && week.children.length > 0 && (
        <div className="px-2 pb-2 space-y-0.5">
          {week.children.map(task => (
            <DayTaskRow key={task.id} task={task} onComplete={onComplete} />
          ))}
        </div>
      )}

      {expanded && week.children.length === 0 && (
        <p className="px-4 pb-3 text-xs text-gray-400 italic">No day tasks — add some manually</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main GoalTreeCard
// ---------------------------------------------------------------------------

export function GoalTreeCard({ goal, onDeleted }: GoalTreeCardProps) {
  const [expanded, setExpanded] = useState(true)
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  // Fetch live completion counts for this goal subtree
  // We approximate using streak data already on the nodes;
  // a proper implementation would call a completions endpoint.
  // For now, build a Map of zeros (will be enriched over time).
  const completionCounts = new Map<string, number>()

  const completeTaskMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const res = await api.post('/completions', { habitId, date: today })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      success('✅ Marked complete!', 'Great work — keep it up.')
    },
    onError: (err: any) => {
      error('Could not mark complete', err.response?.data?.error || err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/habits/${goal.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      success('Deleted', `"${goal.name}" and all sub-goals removed.`)
      onDeleted?.()
    },
  })

  const handleDelete = () => {
    if (window.confirm(`Delete "${goal.name}" and all its week/day tasks? This cannot be undone.`)) {
      deleteMutation.mutate()
    }
  }

  // Aggregate progress: count completions across children
  const weekCount = goal.children.length
  const totalDayTasks = goal.children.reduce((s, w) => s + w.children.length, 0)

  // Approximate overall pct from targetCount (actual completions would need API query)
  const overallPct = 0 // placeholder — streaks/completions would feed this in production

  const momentum = getMomentum(goal, completionCounts)

  const periodLabel = goal.period
    ? `${MONTHS[(goal.period.month ?? 1) - 1]} ${goal.period.year}`
    : null

  return (
    <div className={`rounded-2xl border-2 overflow-hidden shadow-sm transition-all duration-200 ${
      momentum === 'complete' ? 'border-violet-300 bg-violet-50/30' :
      momentum === 'behind' ? 'border-rose-200 bg-rose-50/20' :
      'border-gray-200 bg-white'
    }`}>
      {/* Month Goal Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-white" />
              ) : (
                <ChevronRight className="w-4 h-4 text-white" />
              )}
            </button>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{goal.name}</h3>
              {periodLabel && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3 h-3 text-violet-200" />
                  <span className="text-violet-200 text-xs">{periodLabel}</span>
                  <span className="text-violet-300 text-xs">·</span>
                  <span className="text-violet-200 text-xs">{weekCount} weeks · {totalDayTasks} day tasks</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MomentumBadge momentum={momentum} />
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-400/40 flex items-center justify-center transition-colors text-white/70 hover:text-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-violet-200 mb-1.5">
            <span>Overall progress</span>
            <span>{Math.round(overallPct * 100)}% · {goal.targetCount} target</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.round(overallPct * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Week goals */}
      {expanded && (
        <div className="p-4 space-y-3">
          {goal.children.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No week goals yet.</p>
              <p className="text-xs mt-1">Use the breakdown wizard when creating, or add manually.</p>
            </div>
          ) : (
            goal.children.map((week, i) => (
              <WeekCard
                key={week.id}
                week={week}
                weekIndex={i}
                completionCounts={completionCounts}
                onComplete={(id) => completeTaskMutation.mutate(id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
