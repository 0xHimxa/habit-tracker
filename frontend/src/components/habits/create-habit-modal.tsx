'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X } from 'lucide-react'
import { useToast } from '@/components/providers/toast-provider'

interface CreateHabitModalProps {
  isOpen: boolean
  onClose: () => void
}

interface HabitFormData {
  name: string
  description: string
  goalType: 'daily' | 'weekly' | 'monthly'
  targetCount: number
}

export function CreateHabitModal({ isOpen, onClose }: CreateHabitModalProps) {
  const [formData, setFormData] = useState<HabitFormData>({
    name: '',
    description: '',
    goalType: 'daily',
    targetCount: 1,
  })

  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const createHabitMutation = useMutation({
    mutationFn: async (data: HabitFormData) => {
      const response = await api.post('/habits', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      success('Habit created!', `"${formData.name}" has been added to your habits.`)
      onClose()
      setFormData({
        name: '',
        description: '',
        goalType: 'daily',
        targetCount: 1,
      })
    },
    onError: (err: any) => {
      error('Failed to create habit', err.response?.data?.message || 'Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createHabitMutation.mutate(formData)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'targetCount' ? parseInt(value) || 0 : value,
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Create New Habit</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Habit Name
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Drink Water"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g., Drink 8 glasses of water daily"
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="goalType" className="block text-sm font-medium text-gray-700 mb-1">
                Goal Type
              </label>
              <select
                id="goalType"
                name="goalType"
                value={formData.goalType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label htmlFor="targetCount" className="block text-sm font-medium text-gray-700 mb-1">
                Target Count
              </label>
              <Input
                id="targetCount"
                name="targetCount"
                type="number"
                min="1"
                value={formData.targetCount}
                onChange={handleChange}
                placeholder="1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of times to complete this {formData.goalType} habit
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={createHabitMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createHabitMutation.isPending}
              >
                {createHabitMutation.isPending ? 'Creating...' : 'Create Habit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}