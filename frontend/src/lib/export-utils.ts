import { format } from 'date-fns'

interface Habit {
  id: string
  name: string
  description?: string
  goalType: string
  targetCount: number
  currentStreak?: number
  longestStreak?: number
  active?: boolean
  createdAt?: Date | string
}

interface Completion {
  id: string
  habitId: string
  date: Date | string
  completedAt?: Date | string
  habit?: {
    name: string
    goalType: string
    targetCount: number
  }
}

interface AnalyticsData {
  habitPerformance: Array<{
    name: string
    goalType?: string
    completion: number
    currentStreak: number
    longestStreak: number
  }>
  summary: {
    totalHabits: number
    activeHabits: number
    habitsOnStreak: number
    weeklyCompletionRate: number
  }
}

/**
 * Export habits data to CSV format
 */
export function exportHabitsToCSV(habits: Habit[]): void {
  const headers = [
    'Name',
    'Description',
    'Goal Type',
    'Target Count',
    'Current Streak',
    'Longest Streak',
    'Status',
    'Created At'
  ]

  const rows = habits.map(habit => [
    escapeCSV(habit.name),
    escapeCSV(habit.description || ''),
    habit.goalType,
    habit.targetCount.toString(),
    (habit.currentStreak || 0).toString(),
    (habit.longestStreak || 0).toString(),
    habit.active ? 'Active' : 'Archived',
    habit.createdAt ? format(new Date(habit.createdAt), 'yyyy-MM-dd HH:mm:ss') : ''
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  downloadCSV(csvContent, `habits-${format(new Date(), 'yyyy-MM-dd')}.csv`)
}

/**
 * Export completions data to CSV format
 */
export function exportCompletionsToCSV(completions: Completion[]): void {
  const headers = [
    'Date',
    'Habit Name',
    'Goal Type',
    'Target Count',
    'Completed At'
  ]

  const rows = completions.map(completion => [
    format(new Date(completion.date), 'yyyy-MM-dd'),
    escapeCSV(completion.habit?.name || 'Unknown Habit'),
    completion.habit?.goalType || '',
    (completion.habit?.targetCount || 0).toString(),
    completion.completedAt 
      ? format(new Date(completion.completedAt), 'yyyy-MM-dd HH:mm:ss') 
      : ''
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  downloadCSV(csvContent, `completions-${format(new Date(), 'yyyy-MM-dd')}.csv`)
}

/**
 * Export analytics summary to CSV
 */
export function exportAnalyticsToCSV(analytics: AnalyticsData): void {
  const lines: string[] = []

  // Summary section
  lines.push('=== SUMMARY ===')
  lines.push('')
  lines.push('Metric,Value')
  lines.push(`Total Habits,${analytics.summary.totalHabits}`)
  lines.push(`Active Habits,${analytics.summary.activeHabits}`)
  lines.push(`Habits On Streak,${analytics.summary.habitsOnStreak}`)
  lines.push(`Weekly Completion Rate,${analytics.summary.weeklyCompletionRate}%`)
  lines.push('')
  lines.push('')

  // Habit performance section
  lines.push('=== HABIT PERFORMANCE ===')
  lines.push('')
  lines.push('Habit Name,Goal Type,Completion Rate,Current Streak,Longest Streak')
  
  analytics.habitPerformance.forEach(habit => {
    lines.push([
      escapeCSV(habit.name),
      habit.goalType || 'N/A',
      `${Math.round(habit.completion * 100)}%`,
      habit.currentStreak.toString(),
      habit.longestStreak.toString()
    ].join(','))
  })

  const csvContent = lines.join('\n')
  downloadCSV(csvContent, `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`)
}

/**
 * Export all data as a comprehensive report
 */
export function exportFullReport(
  habits: Habit[],
  completions: Completion[],
  analytics?: AnalyticsData
): void {
  const lines: string[] = []
  const today = format(new Date(), 'yyyy-MM-dd HH:mm:ss')

  // Header
  lines.push('HABIT TRACKER - FULL REPORT')
  lines.push(`Generated on: ${today}`)
  lines.push('')
  lines.push('')

  // Habits section
  lines.push('=== HABITS ===')
  lines.push('')
  lines.push('Name,Description,Goal Type,Target Count,Current Streak,Longest Streak,Status')
  habits.forEach(habit => {
    lines.push([
      escapeCSV(habit.name),
      escapeCSV(habit.description || ''),
      habit.goalType,
      habit.targetCount.toString(),
      (habit.currentStreak || 0).toString(),
      (habit.longestStreak || 0).toString(),
      habit.active ? 'Active' : 'Archived'
    ].join(','))
  })
  lines.push('')
  lines.push('')

  // Completions section
  lines.push('=== RECENT COMPLETIONS ===')
  lines.push('')
  lines.push('Date,Habit Name,Goal Type')
  completions.slice(0, 100).forEach(completion => {
    lines.push([
      format(new Date(completion.date), 'yyyy-MM-dd'),
      escapeCSV(completion.habit?.name || 'Unknown'),
      completion.habit?.goalType || ''
    ].join(','))
  })
  lines.push('')
  lines.push('')

  // Analytics summary
  if (analytics) {
    lines.push('=== ANALYTICS SUMMARY ===')
    lines.push('')
    lines.push('Metric,Value')
    lines.push(`Total Habits,${analytics.summary.totalHabits}`)
    lines.push(`Active Habits,${analytics.summary.activeHabits}`)
    lines.push(`Habits On Streak,${analytics.summary.habitsOnStreak}`)
    lines.push(`Weekly Completion Rate,${analytics.summary.weeklyCompletionRate}%`)
  }

  const csvContent = lines.join('\n')
  downloadCSV(csvContent, `habit-tracker-report-${format(new Date(), 'yyyy-MM-dd')}.csv`)
}

/**
 * Escape special characters for CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Trigger file download
 */
function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
