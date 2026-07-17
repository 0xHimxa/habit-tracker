'use client'

import { useState, useId } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { X, ChevronRight, ChevronLeft, Sparkles, Calendar, Target, Layers, Check, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/components/providers/toast-provider'
import type { ManualBreakdownInput, ManualWeekInput, ManualDayInput } from '@/types'

interface CreateGoalWizardProps {
  isOpen: boolean
  onClose: () => void
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAY_COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#6366f1','#14b8a6']

const currentYear = new Date().getFullYear()
const YEARS = [currentYear, currentYear + 1]

function weeksInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  return Math.ceil((daysInMonth + ((firstDay + 6) % 7)) / 7)
}

type Step = 'type' | 'details' | 'weeks' | 'preview'
type GoalKind = 'standalone' | 'monthly'

interface DayDraft { id: string; name: string; description: string; daysOfWeek: number[]; dailyTarget: number }
interface WeekDraft { id: string; name: string; description: string; weekOfMonth: number; weeklyTarget: number; days: DayDraft[] }

interface FormState {
  kind: GoalKind
  goalType: 'daily' | 'weekly' | 'monthly'
  targetCount: number
  name: string
  description: string
  year: number
  month: number
  monthlyTarget: number
  weeks: WeekDraft[]
}

function makeDayDraft(weekName: string): DayDraft {
  return { id: Math.random().toString(36).slice(2), name: `${weekName} task`, description: '', daysOfWeek: [1], dailyTarget: 1 }
}

function makeWeekDraft(weekOfMonth: number, monthName: string): WeekDraft {
  return {
    id: Math.random().toString(36).slice(2),
    name: `Week ${weekOfMonth} — ${monthName}`,
    description: '',
    weekOfMonth,
    weeklyTarget: 3,
    days: [makeDayDraft(`Week ${weekOfMonth}`)],
  }
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
    weeks: [],
  })

  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const createHabitMutation = useMutation({
    mutationFn: async (data: any) => { const r = await api.post('/habits', data); return r.data },
  })
  const manualBreakdownMutation = useMutation({
    mutationFn: async ({ habitId, payload }: { habitId: string; payload: ManualBreakdownInput }) => {
      const r = await api.post(`/habits/${habitId}/manual-breakdown`, payload); return r.data
    },
  })

  const handleClose = () => { setStep('type'); setForm(f => ({ ...f, name: '', description: '', weeks: [] })); onClose() }

  const maxWeeks = weeksInMonth(form.year, form.month)

  // Week draft helpers
  const addWeek = () => {
    const nextNum = form.weeks.length + 1
    if (nextNum > maxWeeks) return
    setForm(f => ({ ...f, weeks: [...f.weeks, makeWeekDraft(nextNum, MONTHS[f.month - 1])] }))
  }

  const removeWeek = (wid: string) => setForm(f => ({ ...f, weeks: f.weeks.filter(w => w.id !== wid) }))

  const updateWeek = (wid: string, patch: Partial<WeekDraft>) =>
    setForm(f => ({ ...f, weeks: f.weeks.map(w => w.id === wid ? { ...w, ...patch } : w) }))

  const addDay = (wid: string) =>
    setForm(f => ({ ...f, weeks: f.weeks.map(w => w.id === wid ? { ...w, days: [...w.days, makeDayDraft(w.name)] } : w) }))

  const removeDay = (wid: string, did: string) =>
    setForm(f => ({ ...f, weeks: f.weeks.map(w => w.id === wid ? { ...w, days: w.days.filter(d => d.id !== did) } : w) }))

  const updateDay = (wid: string, did: string, patch: Partial<DayDraft>) =>
    setForm(f => ({
      ...f,
      weeks: f.weeks.map(w => w.id === wid ? { ...w, days: w.days.map(d => d.id === did ? { ...d, ...patch } : d) } : w)
    }))

  const toggleDayOfWeek = (wid: string, did: string, dow: number) => {
    const week = form.weeks.find(w => w.id === wid)
    const day = week?.days.find(d => d.id === did)
    if (!day) return
    const newDow = day.daysOfWeek.includes(dow)
      ? day.daysOfWeek.filter(x => x !== dow)
      : [...day.daysOfWeek, dow].sort()
    if (newDow.length === 0) return
    updateDay(wid, did, { daysOfWeek: newDow })
  }

  const handleFinalSubmit = async () => {
    try {
      const payload: any = form.kind === 'standalone'
        ? { name: form.name, description: form.description, goalType: form.goalType, targetCount: form.targetCount, level: 'standalone' }
        : { name: form.name, description: form.description, goalType: 'monthly', targetCount: form.monthlyTarget, level: 'month', period: { year: form.year, month: form.month } }

      const created = await createHabitMutation.mutateAsync(payload)
      const newId = created.data?.id

      if (form.kind === 'monthly' && newId && form.weeks.length > 0) {
        const today = new Date()
        const mbPayload: ManualBreakdownInput = {
          weeks: form.weeks.map((w, i) => {
            const weekStart = new Date(today)
            weekStart.setDate(today.getDate() + i * 7)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)
            weekEnd.setHours(23, 59, 59, 999)
            return {
              name: w.name, description: w.description, weekOfMonth: w.weekOfMonth, weeklyTarget: w.weeklyTarget,
              dateRange: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
              days: w.days.map(d => ({ name: d.name, description: d.description, daysOfWeek: d.daysOfWeek, dailyTarget: d.dailyTarget }))
            }
          })
        }
        await manualBreakdownMutation.mutateAsync({ habitId: newId, payload: mbPayload })
      }

      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      success(form.kind === 'monthly' ? '🎯 Goal Created!' : '✅ Habit Created!', `"${form.name}" is ready.`)
      handleClose()
    } catch (err: any) {
      error('Failed to create', err.response?.data?.error || err.message || 'Please try again.')
    }
  }

  if (!isOpen) return null
  const isLoading = createHabitMutation.isPending || manualBreakdownMutation.isPending

  // ─── Steps ───────────────────────────────────────────────────────────────

  const StepType = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">What do you want to create?</p>
      <div className="grid grid-cols-2 gap-3">
        {([
          { kind: 'monthly' as GoalKind, icon: <Calendar className="w-6 h-6" />, title: 'Monthly Goal', desc: 'Break a big goal into custom weeks & days', color: 'from-violet-500 to-purple-600' },
          { kind: 'standalone' as GoalKind, icon: <Target className="w-6 h-6" />, title: 'Standalone Habit', desc: 'A simple recurring daily/weekly habit', color: 'from-emerald-500 to-teal-600' },
        ] as const).map(opt => (
          <button key={opt.kind} onClick={() => setForm(f => ({ ...f, kind: opt.kind }))}
            className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${form.kind === opt.kind ? 'border-violet-500 bg-violet-50 shadow-md scale-[1.02]' : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'}`}>
            <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${opt.color} text-white mb-3`}>{opt.icon}</div>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">{form.kind === 'monthly' ? 'Goal Name' : 'Habit Name'}</label>
        <Textarea value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={form.kind === 'monthly' ? 'e.g. Get Fit in July' : 'e.g. Drink Water'} rows={2} className="resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional — add some context" rows={2} />
      </div>
      {form.kind === 'monthly' ? (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value), weeks: [] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value), weeks: [] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target <span className="text-gray-400">(×)</span></label>
            <Input type="number" min={1} value={form.monthlyTarget} onChange={e => setForm(f => ({ ...f, monthlyTarget: Number(e.target.value) || 1 }))} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
            <select value={form.goalType} onChange={e => setForm(f => ({ ...f, goalType: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Count</label>
            <Input type="number" min={1} value={form.targetCount} onChange={e => setForm(f => ({ ...f, targetCount: Number(e.target.value) || 1 }))} />
          </div>
        </div>
      )}
    </div>
  )

  const StepWeeks = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Plan your weeks</p>
          <p className="text-xs text-gray-500">{MONTHS[form.month - 1]} {form.year} · up to {maxWeeks} weeks</p>
        </div>
        <Button type="button" size="sm" onClick={addWeek} disabled={form.weeks.length >= maxWeeks}
          className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1 text-xs">
          <Plus className="w-3 h-3" /> Add Week
        </Button>
      </div>

      {form.weeks.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">Click "Add Week" to start planning</p>
          <p className="text-xs text-gray-400 mt-1">You can also skip this and add weeks later</p>
        </div>
      )}

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {form.weeks.map((week, wi) => (
          <div key={week.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Week header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-100">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>{wi + 1}</div>
              <Input value={week.name} onChange={e => updateWeek(week.id, { name: e.target.value })}
                className="flex-1 h-9 text-sm border-0 bg-transparent p-0 focus:ring-0 font-medium" placeholder="Week name..." />
              <button onClick={() => removeWeek(week.id)} className="w-6 h-6 rounded hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 space-y-2">
              <Textarea value={week.description} onChange={e => updateWeek(week.id, { description: e.target.value })}
                className="text-xs text-gray-500 border-gray-200 resize-none" rows={1} placeholder="Week description (optional)..." />

              {/* Day tasks */}
              <div className="space-y-2 pt-1">
                {week.days.map((day, di) => (
                  <div key={day.id} className="bg-gray-50 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-bold flex-shrink-0">{di + 1}</div>
                      <Input value={day.name} onChange={e => updateDay(week.id, day.id, { name: e.target.value })}
                        className="flex-1 h-9 text-sm border-gray-200" placeholder="Task name..." />
                      <button onClick={() => removeDay(week.id, day.id)} className="w-6 h-6 rounded hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Day-of-week pills */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {DAY_LABELS.map((label, dow) => (
                        <button key={dow} type="button" onClick={() => toggleDayOfWeek(week.id, day.id, dow)}
                          className="w-8 h-7 rounded text-[10px] font-semibold transition-all"
                          style={day.daysOfWeek.includes(dow)
                            ? { background: DAY_COLORS[dow], color: '#fff' }
                            : { background: '#f3f4f6', color: '#6b7280' }}>
                          {label}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ml-auto">
                        <button type="button" onClick={() => updateDay(week.id, day.id, { dailyTarget: Math.max(1, day.dailyTarget - 1) })}
                          className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-xs text-gray-600 hover:bg-gray-200">−</button>
                        <span className="text-xs font-bold text-gray-700 w-4 text-center">{day.dailyTarget}</span>
                        <button type="button" onClick={() => updateDay(week.id, day.id, { dailyTarget: Math.min(20, day.dailyTarget + 1) })}
                          className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-xs text-gray-600 hover:bg-gray-200">+</button>
                        <span className="text-[10px] text-gray-400">×/day</span>
                      </div>
                    </div>
                  </div>
                ))}

                <button onClick={() => addDay(week.id)} type="button"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-indigo-300 text-indigo-500 hover:bg-indigo-50 text-xs font-medium transition-colors">
                  <Plus className="w-3 h-3" /> Add Day Task
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const StepPreview = () => {
    const totalDays = form.weeks.reduce((s, w) => s + w.days.length, 0)
    return (
      <div className="space-y-4">
        <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{form.name || '(untitled)'}</div>
              {form.kind === 'monthly' && <div className="text-xs text-violet-600">{MONTHS[form.month - 1]} {form.year} · Monthly Goal</div>}
            </div>
          </div>

          {form.kind === 'monthly' && form.weeks.length > 0 && (
            <div className="space-y-2">
              {form.weeks.map((w, i) => (
                <div key={w.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-800">{w.name}</span>
                    {w.days.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {w.days.map(d => (
                          <span key={d.id} className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                            {d.name} · {DAY_LABELS.filter((_, dow) => d.daysOfWeek.includes(dow)).join('/')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">{w.days.length} tasks</span>
                </div>
              ))}
            </div>
          )}

          {form.kind === 'monthly' && form.weeks.length === 0 && (
            <p className="text-xs text-gray-400">No weeks planned — you can add them after creation.</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-violet-50 rounded-lg"><div className="font-bold text-violet-700">1</div><div className="text-gray-500">Month Goal</div></div>
          <div className="p-2 bg-purple-50 rounded-lg"><div className="font-bold text-purple-700">{form.weeks.length}</div><div className="text-gray-500">Week Goals</div></div>
          <div className="p-2 bg-indigo-50 rounded-lg"><div className="font-bold text-indigo-700">{totalDays}</div><div className="text-gray-500">Day Tasks</div></div>
        </div>
      </div>
    )
  }

  // ─── Step config ─────────────────────────────────────────────────────────

  const steps: { id: Step; title: string; icon: React.ReactNode; canNext: boolean }[] = [
    { id: 'type', title: 'Choose Type', icon: <Layers className="w-4 h-4" />, canNext: true },
    { id: 'details', title: 'Details', icon: <Target className="w-4 h-4" />, canNext: form.name.trim().length > 0 },
    ...(form.kind === 'monthly' ? [{ id: 'weeks' as Step, title: 'Plan Weeks', icon: <Calendar className="w-4 h-4" />, canNext: true }] : []),
    { id: 'preview', title: 'Preview', icon: <Sparkles className="w-4 h-4" />, canNext: true },
  ]

  const currentIdx = steps.findIndex(s => s.id === step)
  const currentStep = steps[currentIdx]
  const isLast = currentIdx === steps.length - 1
  const goNext = () => { if (!isLast) setStep(steps[currentIdx + 1].id) }
  const goPrev = () => { if (currentIdx > 0) setStep(steps[currentIdx - 1].id) }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Create Goal</h2>
            <p className="text-violet-200 text-xs mt-0.5">{currentStep.title}</p>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5 px-6 pt-4">
          {steps.map((s, i) => (
            <div key={s.id} className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${i <= currentIdx ? 'bg-violet-500' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex px-6 mt-1 mb-4">
          {steps.map((s, i) => (
            <div key={s.id} className="flex-1">
              <span className={`text-[10px] ${i <= currentIdx ? 'text-violet-600 font-medium' : 'text-gray-400'}`}>{s.title}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pb-4 min-h-[280px]">
          {step === 'type' && StepType()}
          {step === 'details' && StepDetails()}
          {step === 'weeks' && StepWeeks()}
          {step === 'preview' && StepPreview()}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={currentIdx === 0 ? handleClose : goPrev} disabled={isLoading} className="flex items-center gap-1">
            {currentIdx === 0 ? 'Cancel' : <><ChevronLeft className="w-4 h-4" /> Back</>}
          </Button>
          {isLast ? (
            <Button type="button" onClick={handleFinalSubmit} disabled={isLoading || !currentStep.canNext}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white flex items-center justify-center gap-2">
              {isLoading ? <><span className="animate-spin">⏳</span> Creating...</> : <><Sparkles className="w-4 h-4" /> Create Goal</>}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} disabled={!currentStep.canNext}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white flex items-center justify-center gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
