'use client'

import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isPast, isFuture } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  completions: number
  totalHabits: number
}

interface HabitCalendarProps {
  completions: { date: string; habitId: string; completedAt: string }[]
  habits: Array<{ 
    _id: string; 
    name: string; 
    goalType: 'daily' | 'weekly' | 'monthly'; 
    targetCount: number;
    isActive: boolean 
  }>
  selectedDate: Date
  onDateClick: (date: Date) => void
  onDateComplete: (date: Date, habitId: string) => void
  onDateIncomplete: (date: Date, habitId: string) => void
  loading?: boolean
  userTimezone?: string
}

export function HabitCalendar({ 
  completions, 
  habits, 
  selectedDate, 
  onDateClick,
  onDateComplete,
  onDateIncomplete,
  loading = false,
  userTimezone = 'UTC'
}: HabitCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)

  const activeHabits = habits.filter(h => h.isActive)
  
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    })

    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      
      // Calculate completion status for each habit on this date
      const habitStatuses = activeHabits.map(habit => {
        const habitCompletions = completions.filter(c => 
          c.habitId === habit._id && c.date === dateStr
        )
        const completionCount = habitCompletions.length
        const isCompleted = completionCount >= habit.targetCount
        
        return {
          habitId: habit._id,
          habitName: habit.name,
          goalType: habit.goalType,
          targetCount: habit.targetCount,
          completionCount,
          isCompleted,
          completions: habitCompletions
        }
      })

      const totalCompletedHabits = habitStatuses.filter(h => h.isCompleted).length
      const totalHabitsForDate = activeHabits.length

      return {
        date,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isToday: isToday(date),
        isPast: isPast(date) && !isToday(date),
        isFuture: isFuture(date),
        totalCompletedHabits,
        totalHabits: totalHabitsForDate,
        habitStatuses,
        completionRatio: totalHabitsForDate > 0 ? totalCompletedHabits / totalHabitsForDate : 0
      }
    })
  }, [currentMonth, completions, activeHabits])

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const getDayColor = (day: any) => {
    if (day.isFuture) return 'bg-gray-100 text-gray-400 cursor-not-allowed'
    if (day.isToday) return 'bg-blue-100 border-2 border-blue-500 hover:bg-blue-200'
    if (!day.isCurrentMonth) return 'bg-gray-50 text-gray-400'
    
    if (day.completionRatio === 1) return 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
    if (day.completionRatio >= 0.5) return 'bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer'
    if (day.completionRatio > 0) return 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer'
    if (day.isPast) return 'bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer'
    
    return 'bg-white hover:bg-gray-50 cursor-pointer'
  }

  const handleDayClick = (day: any) => {
    if (day.isFuture) return
    onDateClick(day.date)
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className="relative"
              onMouseEnter={() => setHoveredDate(day.date)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <button
                onClick={() => handleDayClick(day)}
                className={`
                  w-full p-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${getDayColor(day)}
                  ${isSameDay(day.date, selectedDate) ? 'ring-2 ring-blue-500' : ''}
                  ${loading ? 'opacity-50 cursor-wait' : ''}
                `}
                disabled={day.isFuture || loading}
              >
                <div className="text-center">
                  {format(day.date, 'd')}
                </div>
                
                {/* Completion indicator */}
                {day.totalHabits > 0 && (
                  <div className="mt-1">
                    <div className="text-xs">
                      {day.totalCompletedHabits}/{day.totalHabits}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className="bg-current h-1 rounded-full transition-all duration-200"
                        style={{ 
                          width: `${day.completionRatio * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </button>

              {/* Hover tooltip */}
              {hoveredDate && isSameDay(hoveredDate, day.date) && day.habitStatuses.length > 0 && (
                <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 pointer-events-none">
                  <div className="font-medium mb-1">{format(day.date, 'MMM d, yyyy')}</div>
                  {day.habitStatuses.map((status: any) => (
                    <div key={status.habitId} className="flex justify-between items-center py-1">
                      <span className="truncate mr-2">{status.habitName}</span>
                      <span className={status.isCompleted ? 'text-green-400' : 'text-red-400'}>
                        {status.completionCount}/{status.targetCount}
                      </span>
                    </div>
                  ))}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Complete</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Partial</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
            <span>Missed</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-100 rounded"></div>
            <span>Future</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}