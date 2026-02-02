'use client'

import { useMemo } from 'react'
import { format, subDays, startOfWeek, addDays, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface ChainCalendarProps {
  completions: { date: string }[]
  totalDays?: number
  className?: string
}

/**
 * "Don't Break the Chain" visualization
 * GitHub-style contribution calendar showing habit completion intensity
 */
export function ChainCalendar({ 
  completions, 
  totalDays = 365,
  className 
}: ChainCalendarProps) {
  const { weeks, months } = useMemo(() => {
    const today = new Date()
    const startDate = subDays(today, totalDays - 1)
    
    // Build completion map for O(1) lookups
    const completionMap = new Map<string, number>()
    completions.forEach(c => {
      const dateKey = c.date.split('T')[0]
      completionMap.set(dateKey, (completionMap.get(dateKey) || 0) + 1)
    })

    // Generate weeks
    const weeks: Array<{ date: Date; count: number }[]> = []
    let currentWeek: Array<{ date: Date; count: number }> = []
    
    // Align to Sunday start
    const weekStart = startOfWeek(startDate, { weekStartsOn: 0 })
    const totalWeekDays = Math.ceil((today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    for (let i = 0; i < totalWeekDays; i++) {
      const date = addDays(weekStart, i)
      const dateKey = format(date, 'yyyy-MM-dd')
      const count = completionMap.get(dateKey) || 0
      
      currentWeek.push({ date, count })
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    // Generate month labels
    const months: { month: string; colSpan: number }[] = []
    let currentMonth = ''
    let colSpan = 0
    
    weeks.forEach((week) => {
      const firstDay = week.find(d => d.date)?.date
      if (firstDay) {
        const monthLabel = format(firstDay, 'MMM')
        if (monthLabel !== currentMonth) {
          if (currentMonth) {
            months.push({ month: currentMonth, colSpan })
          }
          currentMonth = monthLabel
          colSpan = 1
        } else {
          colSpan++
        }
      }
    })
    if (currentMonth) {
      months.push({ month: currentMonth, colSpan })
    }

    return { weeks, months }
  }, [completions, totalDays])

  const getIntensityClass = (count: number): string => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800'
    if (count === 1) return 'bg-green-200 dark:bg-green-900'
    if (count === 2) return 'bg-green-400 dark:bg-green-700'
    if (count >= 3) return 'bg-green-600 dark:bg-green-500'
    return 'bg-gray-100 dark:bg-gray-800'
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className={cn('overflow-x-auto', className)}>
      {/* Month labels */}
      <div className="flex mb-1 ml-8">
        {months.map((m, i) => (
          <div 
            key={`${m.month}-${i}`}
            style={{ width: `${m.colSpan * 14}px` }}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {m.colSpan >= 3 ? m.month : ''}
          </div>
        ))}
      </div>

      <div className="flex">
        {/* Day labels */}
        <div className="flex flex-col mr-2 text-xs text-gray-500 dark:text-gray-400">
          {dayLabels.map((day, i) => (
            <div 
              key={day} 
              className="h-[10px] leading-[10px] mb-[2px]"
              style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex gap-[2px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[2px]">
              {week.map(({ date, count }, dayIndex) => {
                const today = new Date()
                const isToday = isSameDay(date, today)
                const isFuture = date > today
                
                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      'w-[10px] h-[10px] rounded-sm transition-all duration-200',
                      isFuture 
                        ? 'bg-transparent border border-gray-200 dark:border-gray-700' 
                        : getIntensityClass(count),
                      isToday && 'ring-1 ring-purple-500 ring-offset-1',
                      !isFuture && 'hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-500 cursor-pointer'
                    )}
                    title={`${format(date, 'MMM d, yyyy')}: ${count} completion${count !== 1 ? 's' : ''}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end mt-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>Less</span>
        <div className="flex gap-[2px]">
          <div className="w-[10px] h-[10px] rounded-sm bg-gray-100 dark:bg-gray-800" />
          <div className="w-[10px] h-[10px] rounded-sm bg-green-200 dark:bg-green-900" />
          <div className="w-[10px] h-[10px] rounded-sm bg-green-400 dark:bg-green-700" />
          <div className="w-[10px] h-[10px] rounded-sm bg-green-600 dark:bg-green-500" />
        </div>
        <span>More</span>
      </div>
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
