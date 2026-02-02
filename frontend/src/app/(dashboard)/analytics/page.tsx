'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Target, Flame, Award, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ProgressBar, CircularProgress } from '@/components/ui/progress-bar';
import { StreakBadge } from '@/components/ui/streak-badge';
import { exportAnalyticsToCSV } from '@/lib/export-utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function AnalyticsPage() {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await apiClient.getAnalytics();
      return response;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Loading your progress insights...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shimmer h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="shimmer h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your habit progress</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to load analytics</h3>
            <p className="text-gray-600 dark:text-gray-400">Please try again later or create some habits first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { weeklyProgress, habitPerformance, goalTypeDistribution, monthlyTrend, topStreaks, summary } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your habit progress and insights</p>
        </div>
        <Button
          onClick={() => exportAnalyticsToCSV(analytics)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Habits</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summary.totalHabits}</div>
            <p className="text-xs text-muted-foreground">
              {summary.activeHabits} active
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500 streak-fire" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.habitsOnStreak}</div>
            <p className="text-xs text-muted-foreground">
              habits with active streaks
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Progress</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.todayCompletions}</div>
            <p className="text-xs text-muted-foreground">
              completions today
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.weeklyCompletionRate}%</div>
            <ProgressBar value={summary.weeklyCompletionRate} max={100} size="sm" className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
            <CardDescription>Your habit completions over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="completed" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Completed" />
                  <Bar dataKey="total" fill="#E5E7EB" radius={[4, 4, 0, 0]} name="Target" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
            <CardDescription>Completion rate by week this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Completion']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completion" 
                    stroke="#06B6D4"
                    strokeWidth={3}
                    dot={{ fill: '#06B6D4', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goal Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Goal Distribution</CardTitle>
            <CardDescription>Breakdown by goal type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center">
              {goalTypeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={goalTypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="type"
                    >
                      {goalTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500">No habits yet</p>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {goalTypeDistribution.map((item) => (
                <div key={item.type} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.type}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Streaks */}
        <Card>
          <CardHeader>
            <CardTitle>Top Streaks</CardTitle>
            <CardDescription>Your best performing habits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topStreaks.length > 0 ? (
                topStreaks.map((habit, index) => (
                  <div key={habit.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium truncate max-w-[120px]">{habit.name}</span>
                    </div>
                    <StreakBadge streak={habit.streak} size="sm" />
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Start completing habits to build streaks!</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Habit Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Monthly completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {habitPerformance.length > 0 ? (
                habitPerformance.slice(0, 5).map((habit) => (
                  <div key={habit.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate max-w-[150px]">{habit.name}</span>
                      <span className="text-gray-500">{Math.round(habit.completion * 100)}%</span>
                    </div>
                    <ProgressBar value={habit.completion * 100} max={100} size="sm" variant="gradient" />
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No habits to track yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At Risk Habits Warning */}
      {summary.habitsAtRisk > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                {summary.habitsAtRisk} habit{summary.habitsAtRisk > 1 ? 's' : ''} at risk
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                These habits have broken streaks and low completion rates. Consider adjusting your goals or setting reminders.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}