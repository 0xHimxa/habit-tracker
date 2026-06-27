'use client'

import { useMemo,useState } from 'react'
import { format, subDays, startOfWeek, addDays, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
interface ChainCalendarProps {
  completions: { date: string }[]
  totalDays?: number
  className?: string
}
 
// GitHub's exact hex values
const COLORS_LIGHT = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
const COLORS_DARK  = ['#161b22',  '#0e4429', '#006d32', '#26a641', '#39d353']
 
function getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}
 
// Only Mon, Wed, Fri — matching GitHub (index 0=Sun,1=Mon,...6=Sat)
const DAY_LABEL_MAP: Record<number, string> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' }
 
const CELL = 10
const GAP  = 3
const STEP = CELL + GAP
 
export function ChainCalendar({
  completions,
  totalDays = 365,
  className,
}: ChainCalendarProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
 
  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.documentElement.dataset.mode === 'dark')
 
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT
 
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
 
    // Build completion map
    const completionMap = new Map<string, number>()
    completions.forEach((c) => {
      const key = c.date.split('T')[0]
      completionMap.set(key, (completionMap.get(key) || 0) + 1)
    })
 
    // Align start to the Sunday of the week that was ~totalDays ago
    const startDate = subDays(today, totalDays - 1)
    const weekStart = startOfWeek(startDate, { weekStartsOn: 0 })
 
    const weeks: Array<{ date: Date; count: number }[]> = []
    let currentWeek: { date: Date; count: number }[] = []
    const seenMonths = new Set<string>()
    const monthLabels: { wi: number; label: string }[] = []
 
    const totalDaysInGrid = Math.ceil(
      (today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
 
    for (let i = 0; i < totalDaysInGrid; i++) {
      const date = addDays(weekStart, i)
      const dateKey = format(date, 'yyyy-MM-dd')
      const count = completionMap.get(dateKey) || 0
 
      // Track first appearance of each month (only for days in range)
      if (date >= startDate && date <= today) {
        const mKey = `${date.getFullYear()}-${date.getMonth()}`
        if (!seenMonths.has(mKey)) {
          seenMonths.add(mKey)
          // wi = index of the week column this day will land in
          const wi = Math.floor((weeks.length * 7 + currentWeek.length) / 7)
          monthLabels.push({ wi, label: format(date, 'MMM') })
        }
      }
 
      currentWeek.push({ date, count })
 
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }
 
    if (currentWeek.length > 0) weeks.push(currentWeek)
 
    return { weeks, monthLabels }
  }, [completions, totalDays])
 
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const gridWidth = weeks.length * STEP - GAP
 
  return (
    <div className={cn('overflow-x-auto select-none', className)}>
      <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
 
        {/* Month labels — pinned above the exact column they start in */}
        <div style={{ marginLeft: 28, position: 'relative', height: 16, width: gridWidth, marginBottom: 4 }}>
          {monthLabels.map(({ wi, label }, i) => (
            <span
              key={i}
              className="text-xs text-gray-500 dark:text-gray-400"
              style={{
                position: 'absolute',
                left: wi * STEP,
                top: 0,
                fontSize: 11,
                lineHeight: '16px',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          ))}
        </div>
 
        <div style={{ display: 'flex' }}>
          {/* Day-of-week labels — Mon, Wed, Fri only */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, marginRight: 4, width: 24 }}>
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="text-gray-500 dark:text-gray-400"
                style={{
                  height: CELL,
                  lineHeight: `${CELL}px`,
                  fontSize: 10,
                  textAlign: 'right',
                }}
              >
                {DAY_LABEL_MAP[i] ?? ''}
              </div>
            ))}
          </div>
 
          {/* Week columns */}
          <div style={{ display: 'flex', gap: GAP }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                {week.map(({ date, count }, di) => {
                  const isFuture = date > today
                  const isToday  = isSameDay(date, today)
                  const level    = getLevel(count)
                  const bg       = colors[level]
 
                  return (
                    <div
                      key={di}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 2,
                        background: isFuture ? 'transparent' : bg,
                        cursor: isFuture ? 'default' : 'pointer',
                        outline: isToday ? '1px solid #8b5cf6' : undefined,
                        outlineOffset: isToday ? 1 : undefined,
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        if (isFuture) return
                        const label =
                          count === 0
                            ? 'No habits completed'
                            : `${count} habit${count === 1 ? '' : 's'} completed`
                        setTooltip({
                          text: `${label} on ${format(date, 'MMM d, yyyy')}`,
                          x: e.clientX + 12,
                          y: e.clientY - 36,
                        })
                      }}
                      onMouseMove={(e) =>
                        setTooltip((t) => t && { ...t, x: e.clientX + 12, y: e.clientY - 36 })
                      }
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
 
        {/* Legend */}
        <div
          className="flex items-center justify-end mt-2 gap-1 text-xs text-gray-500 dark:text-gray-400"
          style={{ fontSize: 11 }}
        >
          <span>Less</span>
          {colors.map((c, i) => (
            <div key={i} style={{ width: CELL, height: CELL, borderRadius: 2, background: c }} />
          ))}
          <span>More</span>
        </div>
      </div>
 
      {/* Tooltip — fixed so it escapes Card's overflow:hidden */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            background: '#24292f',
            color: '#fff',
            fontSize: 12,
            padding: '6px 10px',
            borderRadius: 6,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,.3)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
// Compact version for individual habits
export function HabitChainStrip({ 
  completions, 
  days = 30,
  className 
}: { 
  completions: { date: string }[]
  days?: number
  className?: string 
}) {
  const cells = useMemo(() => {
    const today = new Date()
    const completionMap = new Map<string, boolean>()
    
    completions.forEach(c => {
      const dateKey = c.date.split('T')[0]
      completionMap.set(dateKey, true)
    })

    return Array.from({ length: days }, (_, i) => {
      const date = subDays(today, days - 1 - i)
      const dateKey = format(date, 'yyyy-MM-dd')
      return {
        date,
        completed: completionMap.get(dateKey) || false
      }
    })
  }, [completions, days])

  // Calculate current streak
  const currentStreak = useMemo(() => {
    let streak = 0
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i].completed) {
        streak++
      } else {
        break
      }
    }
    return streak
  }, [cells])

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-[2px]">
        {cells.map(({ date, completed }, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-6 rounded-sm transition-all duration-200',
              completed 
                ? 'bg-green-500 dark:bg-green-400' 
                : 'bg-gray-200 dark:bg-gray-700',
              'hover:scale-110'
            )}
            title={`${format(date, 'MMM d')}: ${completed ? 'Completed' : 'Not completed'}`}
          />
        ))}
      </div>
      {currentStreak > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          🔥 {currentStreak} day streak
        </div>
      )}
    </div>
  )
}
