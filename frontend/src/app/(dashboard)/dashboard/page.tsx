'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { apiClient } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, Target, Flame, Calendar } from 'lucide-react'
import { ChainCalendar } from '@/components/habits/chain-calendar'

interface DashboardStats {
  totalHabits: number
  activeHabits: number
  currentStreaks: number
  weeklyCompletion: number
}

interface Habit {
  id: string
  name: string
  description?: string
  goalType: 'daily' | 'weekly' | 'monthly'
  targetCount: number
  currentStreak?: number
  longestStreak?: number
  active: boolean
}

export default function DashboardPage() {
  const { data: habitsData, isLoading: habitsLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const response = await apiClient.getHabits()
      // getHabits returns a PaginatedResponse after handleResponse unwraps the ApiResponse.
      // The backend sends { success, data: [...habits], pagination } and handleResponse
      // returns the top-level 'data' — which is the habits array, not a PaginatedResponse.
      // So we normalise here to always get an array.
      return Array.isArray(response) ? response : (response as any)?.data ?? response ?? []
    },
  })

  // Fetch completions for the chain calendar (last 365 days)
  const { data: completionsData } = useQuery({
    queryKey: ['completions-year'],
    queryFn: async () => {
      const today = new Date()
      const startDate = format(subDays(today, 365), 'yyyy-MM-dd')
      const endDate = format(today, 'yyyy-MM-dd')
      const response = await apiClient.getCompletionsByDateRange({ startDate, endDate })
      return Array.isArray(response) ? response : []
    },
  })

  // habitsData is already the habits array after our queryFn normalisation
  const habits: Habit[] = Array.isArray(habitsData) ? habitsData : []
  const completions = Array.isArray(completionsData) ? completionsData : []

  // Calculate stats from habits data
  const activeHabits = habits.filter((h: Habit) => h.active).length
  const totalHabits = habits.length
  const currentStreaks = habits.filter((h: Habit) => (h.currentStreak || 0) > 0).length
  const avgWeeklyCompletion = habits.length > 0 
    ? Math.round((habits.reduce((sum: number, h: Habit) => sum + (h.currentStreak || 0), 0) / habits.length) * 20)
    : 0

  const statCards = [
    {
      title: 'Total Habits',
      value: totalHabits,
      icon: Target,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Active Habits',
      value: activeHabits,
      icon: Calendar,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Current Streaks',
      value: currentStreaks,
      icon: Flame,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      title: 'Weekly Completion',
      value: `${avgWeeklyCompletion}%`,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ]

  if (habitsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back!</h1>
        <p className="text-gray-600 dark:text-gray-400">Here's an overview of your habit tracking progress.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="card-interactive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chain Calendar - "Don't Break the Chain" */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Don't Break the Chain
          </CardTitle>
          <CardDescription>
            Your habit completion activity over the past year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChainCalendar 
            completions={completions.map(c => ({ date: c.date?.toString() || '' }))} 
            totalDays={365}
          />
        </CardContent>
      </Card>

      {/* Recent Habits and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Habits</CardTitle>
          </CardHeader>
          <CardContent>
            {habits.length > 0 ? (
              <div className="space-y-4">
                {habits.slice(0, 5).map((habit) => (
                  <div key={habit.id} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{habit.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{habit.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                          {habit.goalType}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Target: {habit.targetCount}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                        <Flame className="h-4 w-4" />
                        <span className="font-medium">{habit.currentStreak || 0}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">current streak</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No habits yet. Create your first habit to get started!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all">
                <Target className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">Create New Habit</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Start tracking a new habit</p>
                <Link 
                  href="/habits" 
                  className="inline-block bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25"
                >
                  Create Habit
                </Link>
              </div>
              
              <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all">
                <Calendar className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">View Calendar</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">See your progress over time</p>
                <Link 
                  href="/calendar" 
                  className="inline-block bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-cyan-700 hover:to-teal-700 transition-all shadow-lg shadow-cyan-500/25"
                >
                  View Calendar
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}