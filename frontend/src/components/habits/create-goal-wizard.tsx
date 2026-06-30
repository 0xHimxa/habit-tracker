'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { X, ChevronRight, ChevronLeft, Sparkles, Calendar, Target, Layers, Check } from 'lucide-react'
import { useToast } from '@/components/providers/toast-provider'
import type { GoalLevel, AutoBreakdownInput } from '@/types'

interface CreateGoalWizardProps {
  isOpen: boolean
  onClose: () => void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_COLORS = ['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500']

const currentYear = new Date().getFullYear()
const YEARS = [currentYear, currentYear + 1]

function weeksInMonth(year: number, month: number): number {
  // Count how many Mon-based weeks fit in the month
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  return Math.ceil((daysInMonth + ((firstDay + 6) % 7)) / 7)
}

type Step = 'type' | 'details' | 'breakdown' | 'preview'
type GoalKind = 'standalone' | 'monthly'

interface FormState {
  kind: GoalKind
  // standalone fields
  goalType: 'daily' | 'weekly' | 'monthly'
  targetCount: number
  name: string
  description: string
  // monthly fields
  year: number
  month: number
  monthlyTarget: number
  // breakdown
  wantBreakdown: boolean
  weeks: number
  dailyTarget: number
  daysOfWeek: number[]
}

export function CreateGoalWizard({ isOpen, onClose }: CreateGoalWizardProps) {
  const now = new Date()
  const [step, setStep] = useState<Step>('type')
  const [form, setForm] = useState<FormState>({
    kind: 'monthly',
    goalType: 'daily',
    targetCount: 1,
    name: '',
    description: '',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    monthlyTarget: 20,
    wantBreakdown: true,
    weeks: 4,
    dailyTarget: 1,
    daysOfWeek: [1, 3, 5], // Mon Wed Fri default
  })

  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const createHabitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/habits', data)
      return response.data
    },
  })

  const breakdownMutation = useMutation({
    mutationFn: async ({ habitId, payload }: { habitId: string; payload: AutoBreakdownInput }) => {
      const response = await api.post(`/habits/${habitId}/breakdown`, payload)
      return response.data
    },
  })

  const handleClose = () => {
    setStep('type')
    setForm(f => ({ ...f, name: '', description: '' }))
    onClose()
  }

  const maxWeeks = weeksInMonth(form.year, form.month)

  const suggestedWeeks = Math.min(4, maxWeeks)
  const suggestedDays = [1, 3, 5] // Mon Wed Fri
  const suggestedDailyTarget = 1

  const applyAutoSuggestion = () => {
    setForm(f => ({
      ...f,
      weeks: suggestedWeeks,
      dailyTarget: suggestedDailyTarget,
      daysOfWeek: suggestedDays,
    }))
  }

  const toggleDay = (d: number) => {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d)
        ? f.daysOfWeek.filter(x => x !== d)
        : [...f.daysOfWeek, d].sort(),
    }))
  }

  const handleFinalSubmit = async () => {
    try {
      // 1. Create the month goal (or standalone habit)
      const payload: any =
        form.kind === 'standalone'
          ? {
              name: form.name,
              description: form.description,
              goalType: form.goalType,
              targetCount: form.targetCount,
              level: 'standalone',
            }
          : {
              name: form.name,
              description: form.description,
              goalType: 'monthly',
              targetCount: form.monthlyTarget,
              level: 'month',
              period: { year: form.year, month: form.month },
            }

      const created = await createHabitMutation.mutateAsync(payload)
      const newHabitId = created.data?.id

      // 2. Auto-breakdown if requested
      if (form.kind === 'monthly' && form.wantBreakdown && newHabitId) {
        await breakdownMutation.mutateAsync({
          habitId: newHabitId,
          payload: {
            weeks: form.weeks,
            dailyTarget: form.dailyTarget,
            daysOfWeek: form.daysOfWeek,
          },
        })
      }

      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })

      success(
        form.kind === 'monthly' ? '🎯 Goal Created!' : '✅ Habit Created!',
        form.wantBreakdown && form.kind === 'monthly'
          ? `"${form.name}" broken down into ${form.weeks} weeks`
          : `"${form.name}" has been added.`
      )
      handleClose()
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Please try again.'
      error('Failed to create', msg)
    }
  }

  if (!isOpen) return null

  const isLoading = createHabitMutation.isPending || breakdownMutation.isPending

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  const StepType = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">What do you want to create?</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            kind: 'monthly' as GoalKind,
            icon: <Calendar className="w-6 h-6" />,
            title: 'Monthly Goal',
            desc: 'Break a big goal into weeks & days',
            color: 'from-violet-500 to-purple-600',
          },
          {
            kind: 'standalone' as GoalKind,
            icon: <Target className="w-6 h-6" />,
            title: 'Standalone Habit',
            desc: 'A simple recurring daily/weekly habit',
            color: 'from-emerald-500 to-teal-600',
          },
        ].map(opt => (
          <button
            key={opt.kind}
            onClick={() => setForm(f => ({ ...f, kind: opt.kind }))}
            className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
              form.kind === opt.kind
                ? 'border-violet-500 bg-violet-50 shadow-md scale-[1.02]'
                : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
            }`}
          >
            <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${opt.color} text-white mb-3`}>
              {opt.icon}
            </div>
            <div className="font-semibold text-gray-900 text-sm">{opt.title}</div>
            <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
            {form.kind === opt.kind && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  const StepDetails = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {form.kind === 'monthly' ? 'Goal Name' : 'Habit Name'}
        </label>
        <Input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder={form.kind === 'monthly' ? 'e.g. Get Fit in July' : 'e.g. Drink Water'}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <Textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Optional — add some context"
          rows={2}
        />
      </div>

      {form.kind === 'monthly' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: Number(e.target.value), weeks: Math.min(f.weeks, weeksInMonth(f.year, Number(e.target.value))) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Overall Target <span className="text-gray-400">(total completions for the month)</span>
            </label>
            <Input
              type="number"
              min={1}
              value={form.monthlyTarget}
              onChange={e => setForm(f => ({ ...f, monthlyTarget: Number(e.target.value) || 1 }))}
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
              <select
                value={form.goalType}
                onChange={e => setForm(f => ({ ...f, goalType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Count</label>
              <Input
                type="number"
                min={1}
                value={form.targetCount}
                onChange={e => setForm(f => ({ ...f, targetCount: Number(e.target.value) || 1 }))}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )

  const StepBreakdown = () => (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-3 bg-violet-50 rounded-xl border border-violet-200">
        <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-violet-900">
            {MONTHS[form.month - 1]} {form.year} has up to {maxWeeks} weeks
          </p>
          <p className="text-xs text-violet-600 mt-0.5">
            Smart suggestion: {suggestedWeeks} weeks · Mon/Wed/Fri · {suggestedDailyTarget}x/day
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-violet-400 text-violet-700 hover:bg-violet-100 text-xs ml-auto whitespace-nowrap"
          onClick={applyAutoSuggestion}
        >
          Apply
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="wantBreakdown"
          type="checkbox"
          checked={form.wantBreakdown}
          onChange={e => setForm(f => ({ ...f, wantBreakdown: e.target.checked }))}
          className="w-4 h-4 rounded accent-violet-600"
        />
        <label htmlFor="wantBreakdown" className="text-sm font-medium text-gray-700">
          Auto-generate week & day tasks
        </label>
      </div>

      {form.wantBreakdown && (
        <div className="space-y-4 pl-2 border-l-2 border-violet-200">
          {/* Weeks slider */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Number of Weeks</label>
              <span className="text-sm font-bold text-violet-600">{form.weeks}</span>
            </div>
            <input
              type="range"
              min={1}
              max={maxWeeks}
              value={form.weeks}
              onChange={e => setForm(f => ({ ...f, weeks: Number(e.target.value) }))}
              className="w-full accent-violet-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 week</span>
              <span>{maxWeeks} weeks</span>
            </div>
          </div>

          {/* Daily target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Target Count</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, dailyTarget: Math.max(1, f.dailyTarget - 1) }))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold"
              >−</button>
              <span className="text-xl font-bold text-gray-900 w-8 text-center">{form.dailyTarget}</span>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, dailyTarget: Math.min(20, f.dailyTarget + 1) }))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold"
              >+</button>
              <span className="text-xs text-gray-500">per day</span>
            </div>
          </div>

          {/* Days of week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Active Days</label>
            <div className="flex gap-2 flex-wrap">
              {DAY_LABELS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-full text-xs font-semibold transition-all duration-150 ${
                    form.daysOfWeek.includes(i)
                      ? `${DAY_COLORS[i % DAY_COLORS.length]} text-white shadow-md scale-110`
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
            <div>📅 <strong>{form.weeks} week goals</strong> will be created under your month goal</div>
            <div>🗓 <strong>{form.weeks * form.daysOfWeek.length} day tasks</strong> across {DAY_LABELS.filter((_, i) => form.daysOfWeek.includes(i)).join(', ')} each week</div>
            <div>🎯 <strong>{form.dailyTarget}x per day</strong> → <strong>{form.dailyTarget * form.daysOfWeek.length}x per week</strong> target</div>
          </div>
        </div>
      )}
    </div>
  )

  const StepPreview = () => (
    <div className="space-y-4">
      <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{form.name || '(untitled)'}</div>
            {form.kind === 'monthly' && (
              <div className="text-xs text-violet-600">{MONTHS[form.month - 1]} {form.year} • Monthly Goal</div>
            )}
          </div>
        </div>
        {form.description && <p className="text-sm text-gray-600 mb-3">{form.description}</p>}

        {form.kind === 'monthly' && form.wantBreakdown && (
          <div className="space-y-2">
            {Array.from({ length: form.weeks }, (_, w) => (
              <div key={w} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                <div className="flex-1 text-xs text-gray-700">
                  <span className="font-medium">Week {w + 1}</span>
                  <span className="text-gray-400 ml-2">
                    {DAY_LABELS.filter((_, i) => form.daysOfWeek.includes(i)).join(' · ')} · {form.dailyTarget}x each
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {form.daysOfWeek.length} day tasks
                </div>
              </div>
            ))}
          </div>
        )}

        {form.kind === 'monthly' && !form.wantBreakdown && (
          <p className="text-xs text-gray-500">No breakdown — you can add week/day tasks manually later</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 bg-violet-50 rounded-lg">
          <div className="font-bold text-violet-700">1</div>
          <div className="text-gray-500">Month Goal</div>
        </div>
        {form.kind === 'monthly' && form.wantBreakdown && (
          <>
            <div className="p-2 bg-purple-50 rounded-lg">
              <div className="font-bold text-purple-700">{form.weeks}</div>
              <div className="text-gray-500">Week Goals</div>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <div className="font-bold text-indigo-700">{form.weeks * form.daysOfWeek.length}</div>
              <div className="text-gray-500">Day Tasks</div>
            </div>
          </>
        )}
      </div>
    </div>
  )

  // ---------------------------------------------------------------------------
  // Step config
  // ---------------------------------------------------------------------------

  const steps: { id: Step; title: string; icon: React.ReactNode; canNext: boolean }[] = [
    { id: 'type', title: 'Choose Type', icon: <Layers className="w-4 h-4" />, canNext: true },
    { id: 'details', title: 'Details', icon: <Target className="w-4 h-4" />, canNext: form.name.trim().length > 0 },
    ...(form.kind === 'monthly'
      ? [{ id: 'breakdown' as Step, title: 'Breakdown', icon: <Calendar className="w-4 h-4" />, canNext: !form.wantBreakdown || form.daysOfWeek.length > 0 }]
      : []),
    { id: 'preview', title: 'Preview', icon: <Sparkles className="w-4 h-4" />, canNext: true },
  ]

  const currentIdx = steps.findIndex(s => s.id === step)
  const currentStep = steps[currentIdx]
  const isLast = currentIdx === steps.length - 1

  const goNext = () => {
    if (!isLast) setStep(steps[currentIdx + 1].id)
  }
  const goPrev = () => {
    if (currentIdx > 0) setStep(steps[currentIdx - 1].id)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Create Goal</h2>
            <p className="text-violet-200 text-xs mt-0.5">{currentStep.title}</p>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 px-6 pt-4">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= currentIdx ? 'bg-violet-500 flex-1' : 'bg-gray-200 flex-1'
              }`}
            />
          ))}
        </div>

        {/* Step labels */}
        <div className="flex px-6 mt-1 mb-4">
          {steps.map((s, i) => (
            <div key={s.id} className="flex-1">
              <span className={`text-[10px] ${i <= currentIdx ? 'text-violet-600 font-medium' : 'text-gray-400'}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pb-4 min-h-[280px]">
          {step === 'type' && <StepType />}
          {step === 'details' && <StepDetails />}
          {step === 'breakdown' && <StepBreakdown />}
          {step === 'preview' && <StepPreview />}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={currentIdx === 0 ? handleClose : goPrev}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            {currentIdx === 0 ? (
              'Cancel'
            ) : (
              <><ChevronLeft className="w-4 h-4" /> Back</>
            )}
          </Button>

          {isLast ? (
            <Button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isLoading || !currentStep.canNext}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><span className="animate-spin">⏳</span> Creating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Create Goal</>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goNext}
              disabled={!currentStep.canNext}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white flex items-center justify-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
