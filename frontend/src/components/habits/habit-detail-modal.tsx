'use client'

import { useState } from 'react'
import { format, isSameDay, isPast, isFuture, isToday } from 'date-fns'
import { X, Check, X as XIcon, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GoalType } from '@/types'

interface HabitDetailModalProps {
  habit: {
    _id: string
    name: string
    description?: string
    goalType: GoalType
    targetCount: number
  }
  selectedDate: Date
  completions: Array<{
    id: string
    date: string
    completedAt: string
  }>
  onClose: () => void
  onComplete: (habitId: string, date: Date) => void
  onIncomplete: (completionId: string) => void
  loading?: boolean
}

export function HabitDetailModal({
  habit,
  selectedDate,
  completions,
  onClose,
  onComplete,
  onIncomplete,
  loading = false
}: HabitDetailModalProps) {
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const todayCompletions = completions.filter(c => c.date === dateStr)
  const completionCount = todayCompletions.length
  const isCompleted = completionCount >= habit.targetCount
  const canComplete = !isFuture(selectedDate) && !loading

  const handleComplete = () => {
    if (!canComplete) return
    onComplete(habit._id, selectedDate)
  }

  const handleRemoveCompletion = (completionId: string) => {
    if (loading) return
    onIncomplete(completionId)
  }

  const getGoalTypeLabel = (type: GoalType) => {
    switch (type) {
      case 'daily': return 'Daily'
      case 'weekly': return 'Weekly'
      case 'monthly': return 'Monthly'
      default: return type
    }
  }

  const getGoalTypeColor = (type: GoalType) => {
    switch (type) {
      case 'daily': return 'bg-blue-100 text-blue-800'
      case 'weekly': return 'bg-purple-100 text-purple-800'
      case 'monthly': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold truncate">
              {habit.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getGoalTypeColor(habit.goalType)}>
                {getGoalTypeLabel(habit.goalType)}
              </Badge>
              <span className="text-sm text-gray-500">
                Target: {habit.targetCount} {habit.targetCount === 1 ? 'time' : 'times'}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {habit.description && (
            <p className="text-sm text-gray-600">{habit.description}</p>
          )}

          {/* Date info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Date</span>
              <span className="text-sm">{format(selectedDate, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-medium">Status</span>
              <Badge 
                variant={isCompleted ? "default" : "secondary"}
                className={isCompleted ? "bg-green-100 text-green-800" : ""}
              >
                {isCompleted ? "Completed" : "In Progress"}
              </Badge>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">
                {completionCount}/{habit.targetCount}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min((completionCount / habit.targetCount) * 100, 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Today's completions */}
          {todayCompletions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Today's Completions</h4>
              <div className="space-y-1">
                {todayCompletions.map((completion) => (
                  <div 
                    key={completion.id} 
                    className="flex items-center justify-between bg-green-50 rounded-lg p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {format(new Date(completion.completedAt), 'h:mm a')}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCompletion(completion.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleComplete}
              disabled={!canComplete || loading}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              {completionCount === 0 ? 'Start Habit' : 'Add Completion'}
            </Button>
            
            {isCompleted && (
              <Button 
                variant="outline"
                onClick={() => {
                  // Remove last completion to make it incomplete
                  if (todayCompletions.length > 0) {
                    handleRemoveCompletion(todayCompletions[todayCompletions.length - 1].id)
                  }
                }}
                disabled={loading}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Minus className="h-4 w-4 mr-2" />
                Undo
              </Button>
            )}
          </div>

          {/* Status messages */}
          {!canComplete && (
            <div className="text-center text-sm text-gray-500">
              {isFuture(selectedDate) 
                ? "Cannot complete future dates"
                : loading ? "Processing..." : ""
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}