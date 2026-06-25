'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiClient, api } from '@/lib/api'
import { CreateHabitModal } from '@/components/habits/create-habit-modal'
import { HabitCard } from '@/components/habits/habit-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter } from 'lucide-react'
import { Select } from '@/components/ui/select'

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

export default function HabitsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all')

  const queryClient = useQueryClient()

  const { data: habits, isLoading } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: async () => {
      const response = await api.get('/habits')
      // API returns { success: true, data: habits[], pagination: {} }
      const habitsData = response.data.data || []
      // Normalize _id to id for consistent property access
      return habitsData.map((h: any) => ({
        ...h,
        _id: h._id || h.id,
        isActive: h.active ?? h.isActive ?? true
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

  const handleCompleteHabit = (habitId: string) => {
    completeHabitMutation.mutate(habitId)
  }

  const filteredHabits = habits?.filter(habit => {
    const matchesSearch = habit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         habit.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || habit.goalType === filterType
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && habit.isActive) ||
                         (filterStatus === 'archived' && !habit.isActive)
    
    return matchesSearch && matchesType && matchesStatus
  }) || []

  const activeHabits = filteredHabits.filter(h => h.isActive)
  const archivedHabits = filteredHabits.filter(h => !h.isActive)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Habits</h1>
          <p className="text-gray-600">Manage and track your habits</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Habit
        </Button>
      </div>

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
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">All Types</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-blue-900 font-medium">Total Habits</div>
          <div className="text-2xl font-bold text-blue-600">{filteredHabits.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-green-900 font-medium">Active Habits</div>
          <div className="text-2xl font-bold text-green-600">{activeHabits.length}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-orange-900 font-medium">Archived</div>
          <div className="text-2xl font-bold text-orange-600">{archivedHabits.length}</div>
        </div>
      </div>

      {/* Active Habits */}
      {activeHabits.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Active Habits ({activeHabits.length})
          </h2>
          <div className="space-y-4">
            {activeHabits.map((habit) => (
              <HabitCard
                key={habit._id}
                habit={habit}
                onComplete={handleCompleteHabit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Archived Habits */}
      {archivedHabits.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Archived Habits ({archivedHabits.length})
          </h2>
          <div className="space-y-4">
            {archivedHabits.map((habit) => (
              <HabitCard
                key={habit._id}
                habit={habit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredHabits.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Plus className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
              ? 'No habits found' 
              : 'No habits yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first habit to get started on your journey'}
          </p>
          {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Habit
            </Button>
          )}
        </div>
      )}

      {/* Create Habit Modal */}
      <CreateHabitModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}