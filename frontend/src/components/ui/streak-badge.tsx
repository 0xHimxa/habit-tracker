'use client'

import { cn } from '@/lib/utils'
import { Flame } from 'lucide-react'

interface StreakBadgeProps {
  streak: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
  animate?: boolean
}

export function StreakBadge({
  streak,
  size = 'md',
  showLabel = true,
  className,
  animate = true,
}: StreakBadgeProps) {
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1',
      icon: 'h-3 w-3',
      text: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5',
      icon: 'h-4 w-4',
      text: 'text-sm',
    },
    lg: {
      container: 'px-4 py-2',
      icon: 'h-5 w-5',
      text: 'text-base',
    },
  }
  
  // Get color based on streak length
  const getStreakColor = () => {
    if (streak >= 100) return {
      bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
      text: 'text-white',
      icon: 'text-yellow-300',
    }
    if (streak >= 30) return {
      bg: 'bg-gradient-to-r from-orange-500 to-red-500',
      text: 'text-white',
      icon: 'text-yellow-300',
    }
    if (streak >= 14) return {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-300',
      icon: 'text-orange-500',
    }
    if (streak >= 7) return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-500',
    }
    if (streak >= 3) return {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-300',
      icon: 'text-yellow-500',
    }
    return {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
      icon: 'text-gray-400',
    }
  }
  
  const colors = getStreakColor()
  const sizes = sizeClasses[size]
  
  if (streak === 0) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 rounded-full',
          'bg-gray-100 dark:bg-gray-800',
          sizes.container,
          className
        )}
      >
        <Flame className={cn(sizes.icon, 'text-gray-400')} />
        {showLabel && (
          <span className={cn(sizes.text, 'font-medium text-gray-500')}>
            No streak
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full',
        colors.bg,
        sizes.container,
        className
      )}
    >
      <Flame
        className={cn(
          sizes.icon,
          colors.icon,
          animate && streak >= 7 && 'streak-fire'
        )}
      />
      <span className={cn(sizes.text, 'font-bold', colors.text)}>
        {streak}
      </span>
      {showLabel && (
        <span className={cn(sizes.text, 'font-medium', colors.text)}>
          {streak === 1 ? 'day' : 'days'}
        </span>
      )}
    </div>
  )
}

interface StreakChainProps {
  days: { date: string; completed: boolean }[]
  className?: string
}

export function StreakChain({ days, className }: StreakChainProps) {
  return (
    <div className={cn('flex gap-1 items-center', className)}>
      {days.map((day, index) => (
        <div
          key={day.date}
          className={cn(
            'w-4 h-4 rounded-sm transition-all duration-200',
            day.completed
              ? 'bg-gradient-to-br from-orange-400 to-red-500 shadow-sm'
              : 'bg-gray-200 dark:bg-gray-700'
          )}
          title={day.date}
        />
      ))}
    </div>
  )
}
