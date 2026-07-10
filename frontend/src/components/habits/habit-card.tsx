'use client'

import { Flame, Target, Trash2, Edit, Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'

interface Habit {
  _id: string
  name: string
  description: string
  goalType: 'daily' | 'weekly' | 'monthly'
  targetCount: number
  currentStreak: number
  longestStreak: number
  isActive: boolean
  completedToday?: boolean
  level?: 'standalone' | 'month' | 'week' | 'day'
}

interface HabitCardProps {
  habit: Habit
  onComplete?: (habitId: string) => void
}

export function HabitCard({ habit, onComplete }: HabitCardProps) {
  const queryClient = useQueryClient()

  const deleteHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      await api.delete(`/habits/${habitId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
  

  const toggleHabitStatusMutation = useMutation({

    mutationFn: async ({ habitId, isActive }: { habitId: string; isActive: boolean }) => {
      const response = await api.put(`/habits/${habitId}`, { active: isActive })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      deleteHabitMutation.mutate(habit._id)
    }
  }

  const handleToggleStatus = () => {
    toggleHabitStatusMutation.mutate({
      habitId: habit._id,
      isActive: !habit.isActive,
    })
  }

  const handleComplete = () => {
    if (onComplete) {
      onComplete(habit._id)
    }
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-purple-600'
    if (streak >= 14) return 'text-blue-600'
    if (streak >= 7) return 'text-green-600'
    if (streak >= 3) return 'text-orange-600'
    return 'text-gray-600'
  }

  const getGoalTypeIcon = (goalType: string) => {
    switch (goalType) {
      case 'daily':
        return '📅'
      case 'weekly':
        return '📊'
      case 'monthly':
        return '📈'
      default:
        return '🎯'
    }
  }

  return (
    <Card className={`transition-all duration-200 ${!habit.isActive ? 'opacity-60' : 'hover:shadow-md'}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{habit.name}</h3>
              <span className="text-lg">{getGoalTypeIcon(habit.goalType)}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                habit.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {habit.isActive ? 'Active' : 'Archived'}
              </span>
              {habit.level && habit.level !== 'standalone' && (
                <span className="text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-700 capitalize">
                  {habit.level}
                </span>
              )}
            </div>
            
            <p className="text-gray-600 text-sm mb-3">{habit.description}</p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Target className="h-4 w-4" />
                <span>{habit.goalType} • {habit.targetCount}x</span>
              </div>
              <div className={`flex items-center space-x-1 ${getStreakColor(habit.currentStreak)}`}>
                <Flame className="h-4 w-4" />
                <span className="font-medium">{habit.currentStreak} day{habit.currentStreak !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {habit.longestStreak > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                Best: {habit.longestStreak} days
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {habit.goalType === 'daily' && habit.isActive && (
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={habit.completedToday}
                className="min-w-[80px]"
              >
                {habit.completedToday ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Done
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-1" />
                    Complete
                  </>
                )}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={toggleHabitStatusMutation.isPending}
            >
              {habit.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteHabitMutation.isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}