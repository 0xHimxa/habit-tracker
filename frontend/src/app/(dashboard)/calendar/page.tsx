'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isToday, isPast, isFuture } from 'date-fns'
import { apiClient } from '@/lib/api'
import { HabitCalendar } from '@/components/habits/habit-calendar'
import { HabitDetailModal } from '@/components/habits/habit-detail-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, Target, Flame, Calendar as CalendarIcon } from 'lucide-react'

interface Habit {
  _id: string
  name: string
  description: string
  goalType: 'daily' | 'weekly' | 'monthly'
  targetCount: number
  currentStreak: number
  longestStreak: number
  isActive: boolean
}

interface Completion {
  _id: string
  habitId: string
  date: string
  completedAt: string
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null)

  const queryClient = useQueryClient()

  const { data: habitsData, isLoading: habitsLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      return await apiClient.getHabits()
    },
  })

  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['calendar', new Date().getFullYear(), new Date().getMonth() + 1],
    queryFn: async () => {
      return await apiClient.getCalendarData(new Date().getFullYear(), new Date().getMonth() + 1)
    },
  })

  const completeHabitMutation = useMutation({
    mutationFn: async ({ habitId, date }: { habitId: string; date: string }) => {
      return await apiClient.createCompletion({ habitId, date })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })

  const removeCompletionMutation = useMutation({
    mutationFn: async (completionId: string) => {
      return await apiClient.deleteCompletion(completionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const handleHabitToggle = (habitId: string, date: Date) => {
    if (isFuture(date)) return

    const dateStr = format(date, 'yyyy-MM-dd')
    const habitStatus = selectedDayData?.habitStatuses.find(status => status.habitId === habitId)

    if (habitStatus && habitStatus.isCompleted) {
      const completion = habitStatus.completions[0]
      if (completion) {
        removeCompletionMutation.mutate(completion.id)
      }
    } else {
      completeHabitMutation.mutate({ habitId, date: dateStr })
    }
  }

  const handleHabitDetail = (habit: Habit) => {
    setSelectedHabit(habit)
  }

  const handleModalComplete = (habitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    completeHabitMutation.mutate({ habitId, date: dateStr })
  }

  const handleModalIncomplete = (completionId: string) => {
    removeCompletionMutation.mutate(completionId)
  }

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  // Normalize habits data to ensure consistent id property
  const rawHabits = habitsData?.data || []
  const habits = rawHabits.map((h: any) => ({
    ...h,
    id: h.id || h._id,
    isActive: h.active ?? h.isActive ?? true
  }))
  const calendarDays = calendarData?.days || []
  const selectedDayData = calendarDays.find((day: any) => day.date === selectedDateStr)
  const selectedDateCompletions = selectedDayData?.habitStatuses.flatMap((status: any) => status.completions) || []
  
  // Daily habits always show, weekly/monthly show on their respective days
  const selectedDateHabits = habits.filter((h: any) => {
    if (!h.isActive) return false
    if (h.goalType === 'daily') return true
    if (h.goalType === 'weekly') {
      // For weekly habits, show on all days to track progress
      return true
    }
    if (h.goalType === 'monthly') {
      // For monthly habits, show on all days to track progress
      return true
    }
    return false
  })

  const isDateInPast = isPast(selectedDate) && !isToday(selectedDate)
  const isDateToday = isToday(selectedDate)
  const isDateInFuture = isFuture(selectedDate)

  if (habitsLoading || calendarLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-600">Track your habit completions over time</p>
      </div>

      {/* Calendar */}
      <HabitCalendar
        completions={calendarDays.flatMap(day => 
          day.habitStatuses.map(status => ({
            date: day.date,
            habitId: status.habitId,
            completedAt: status.completions[0]?.completedAt?.toString() || ''
          }))
        )}
        habits={habits.map((h: any) => ({ 
          ...h, 
          _id: h.id, 
          isActive: h.isActive,
          goalType: h.goalType,
          targetCount: h.targetCount
        }))}
        selectedDate={selectedDate}
        onDateClick={handleDateClick}
        onDateComplete={(date, habitId) => handleHabitToggle(habitId, date)}
        onDateIncomplete={(date, habitId) => handleHabitToggle(habitId, date)}
        loading={completeHabitMutation.isPending || removeCompletionMutation.isPending}
      />

      {/* Selected Date Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
            <div className="flex items-center space-x-2">
              {isDateToday && (
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Today</span>
              )}
              {isDateInPast && (
                <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">Past</span>
              )}
              {isDateInFuture && (
                <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Future</span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateHabits.length === 0 ? (
            <div className="text-center py-8">
              {selectedDate.getDay() === 1 && selectedDate.getDate() === 1 ? (
                <p className="text-gray-500">No habits to track for this date</p>
              ) : selectedDate.getDay() === 1 ? (
                <p className="text-gray-500">No weekly habits to track</p>
              ) : selectedDate.getDate() === 1 ? (
                <p className="text-gray-500">No monthly habits to track</p>
              ) : (
                <p className="text-gray-500">Only weekly and monthly habits are tracked on specific days</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                {selectedDateCompletions.length} of {selectedDateHabits.length} habits completed
              </div>
              
               {selectedDateHabits.map((habit) => {
                 const habitStatus = selectedDayData?.habitStatuses.find(status => status.habitId === habit.id)
                 const isCompleted = habitStatus?.isCompleted || false
                 
                 return (
                   <div
                     key={habit.id}
                     className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                       isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                     }`}
                   >
                     <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleHabitToggle(habit.id, selectedDate)}
                              disabled={isDateInFuture}
                              className={`p-1 rounded-full transition-colors ${
                                isDateInFuture 
                                  ? 'cursor-not-allowed opacity-50' 
                                  : 'hover:scale-110 active:scale-95'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                            
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{habit.name}</h4>
                              <p className="text-sm text-gray-600">{habit.description}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  {habit.goalType}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {habitStatus?.completionCount || 0}/{habit.targetCount}
                                </span>
                                <div className="flex items-center space-x-1 text-orange-600">
                                  <Flame className="h-3 w-3" />
                                  <span className="text-xs font-medium">{habit.currentStreak || 0}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleHabitDetail(habit)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Target className="h-4 w-4" />
                          </Button>
                        </div>
                     </div>
                   </div>
                 )
               })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Today's Progress</div>
            <div className="text-2xl font-bold text-gray-900">
              {selectedDateCompletions.length}/{selectedDateHabits.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Active Habits</div>
            <div className="text-2xl font-bold text-gray-900">
              {habits.filter(h => h.active).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Completions</div>
            <div className="text-2xl font-bold text-gray-900">
              {calendarDays.flatMap(day => day.habitStatuses.filter(status => status.isCompleted)).length}
            </div>
          </CardContent>
        </Card>

      {/* Habit Detail Modal */}
      {selectedHabit && (
        <HabitDetailModal
          habit={selectedHabit}
          selectedDate={selectedDate}
          completions={selectedDateCompletions}
          onClose={() => setSelectedHabit(null)}
          onComplete={handleModalComplete}
          onIncomplete={handleModalIncomplete}
          loading={completeHabitMutation.isPending || removeCompletionMutation.isPending}
        />
      )}
      </div>
    </div>
  )
}