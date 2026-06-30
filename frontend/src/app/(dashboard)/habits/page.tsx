'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient, api } from '@/lib/api'
import { CreateHabitModal } from '@/components/habits/create-habit-modal'
import { CreateGoalWizard } from '@/components/habits/create-goal-wizard'
import { HabitCard } from '@/components/habits/habit-card'
import { GoalTreeCard } from '@/components/habits/goal-tree-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Layers, Target, Sparkles } from 'lucide-react'
import type { GoalNode } from '@/types'

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
}

type TabId = 'goals' | 'habits'

export default function HabitsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('goals')
  const [isGoalWizardOpen, setIsGoalWizardOpen] = useState(false)
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all')

  const queryClient = useQueryClient()

  // --- Goal tree query ---
  const { data: goals = [], isLoading: goalsLoading } = useQuery<GoalNode[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await api.get('/habits/goals')
      return res.data.data || []
    },
  })

  // --- Standalone habits query ---
  const { data: habits, isLoading: habitsLoading } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: async () => {
      const response = await api.get('/habits')
      const habitsData = response.data.data || []
      return habitsData.map((h: any) => ({
        ...h,
        _id: h._id || h.id,
        isActive: h.active ?? h.isActive ?? true,
      }))
    },
  })

  const completeHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const today = format(new Date(), 'yyyy-MM-dd')
      return await apiClient.createCompletion({ habitId, date: today })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const filteredHabits = habits?.filter(habit => {
    const matchesSearch =
      habit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      habit.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || habit.goalType === filterType
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && habit.isActive) ||
      (filterStatus === 'archived' && !habit.isActive)
    return matchesSearch && matchesType && matchesStatus
  }) || []

  const activeHabits = filteredHabits.filter(h => h.isActive)
  const archivedHabits = filteredHabits.filter(h => !h.isActive)

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'goals', label: 'Goal Plans', icon: <Layers className="w-4 h-4" />, count: goals.length },
    { id: 'habits', label: 'Standalone Habits', icon: <Target className="w-4 h-4" />, count: habits?.length },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Habits & Goals</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your progress, one day at a time</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'goals' ? (
            <Button
              onClick={() => setIsGoalWizardOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              New Goal Plan
            </Button>
          ) : (
            <Button onClick={() => setIsHabitModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Habit
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* --- Goals Tab --- */}
      {activeTab === 'goals' && (
        <>
          {goalsLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-gray-200 h-40" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No goal plans yet</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                Create a Monthly Goal and break it down into weeks and daily tasks automatically.
              </p>
              <Button
                onClick={() => setIsGoalWizardOpen(true)}
                className="bg-gradient-to-r from-violet-600 to-purple-600 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Create Your First Goal Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {goals.map(goal => (
                <GoalTreeCard key={goal.id} goal={goal} />
              ))}
            </div>
          )}
        </>
      )}

      {/* --- Standalone Habits Tab --- */}
      {activeTab === 'habits' && (
        <>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search habits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="all">All Types</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="text-blue-900 font-medium text-sm">Total</div>
              <div className="text-2xl font-bold text-blue-600">{filteredHabits.length}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl">
              <div className="text-green-900 font-medium text-sm">Active</div>
              <div className="text-2xl font-bold text-green-600">{activeHabits.length}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl">
              <div className="text-orange-900 font-medium text-sm">Archived</div>
              <div className="text-2xl font-bold text-orange-600">{archivedHabits.length}</div>
            </div>
          </div>

          {habitsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {activeHabits.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-gray-800">Active ({activeHabits.length})</h2>
                  {activeHabits.map(habit => (
                    <HabitCard
                      key={habit._id}
                      habit={habit}
                      onComplete={(id) => completeHabitMutation.mutate(id)}
                    />
                  ))}
                </div>
              )}

              {archivedHabits.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-gray-800">Archived ({archivedHabits.length})</h2>
                  {archivedHabits.map(habit => (
                    <HabitCard key={habit._id} habit={habit} />
                  ))}
                </div>
              )}

              {filteredHabits.length === 0 && (
                <div className="text-center py-12">
                  <Target className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    {searchTerm || filterType !== 'all' ? 'No habits found' : 'No standalone habits'}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {searchTerm || filterType !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create a simple recurring habit to track daily or weekly routines'}
                  </p>
                  {!searchTerm && filterType === 'all' && (
                    <Button onClick={() => setIsHabitModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Create Habit
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modals */}
      <CreateGoalWizard isOpen={isGoalWizardOpen} onClose={() => setIsGoalWizardOpen(false)} />
      <CreateHabitModal isOpen={isHabitModalOpen} onClose={() => setIsHabitModalOpen(false)} />
    </div>
  )
}