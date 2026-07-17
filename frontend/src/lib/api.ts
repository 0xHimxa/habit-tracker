import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  Habit,
  HabitCompletion,
  CalendarData,
  ApiResponse,
  PaginatedResponse,
  CreateHabitInput,
  UpdateHabitInput,
  CreateCompletionInput
} from '@/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || '',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): Promise<T> {
    if (!response.data.success) {
      throw new Error(response.data.error || 'API request failed');
    }

    return response.data.data!;
  }

  // Habit methods
  async getHabits(params?: {
    page?: number;
    limit?: number;
    goalType?: string;
    active?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Habit>> {
    const response = await this.client.get('/api/habits', { params });
    const body = response.data;
    if (!body.success) {
      throw new Error(body.error || 'API request failed');
    }
    return {
      data: body.data ?? [],
      pagination: body.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    };
  }

  async getHabit(habitId: string): Promise<Habit> {
    const response = await this.client.get(`/api/habits/${habitId}`);
    return this.handleResponse<Habit>(response);
  }

  async createHabit(habitData: CreateHabitInput): Promise<Habit> {
    const response = await this.client.post('/api/habits', habitData);
    return this.handleResponse<Habit>(response);
  }

  async updateHabit(habitId: string, habitData: UpdateHabitInput): Promise<Habit> {
    const response = await this.client.put(`/api/habits/${habitId}`, habitData);
    return this.handleResponse<Habit>(response);
  }

  async deleteHabit(habitId: string): Promise<void> {
    const response = await this.client.delete(`/api/habits/${habitId}`);
    await this.handleResponse<void>(response);
  }

  // Completion methods
  async createCompletion(completionData: CreateCompletionInput): Promise<HabitCompletion & {
    streaks: { currentStreak: number; longestStreak: number };
  }> {
    const response = await this.client.post('/api/completions', completionData);
    return this.handleResponse<HabitCompletion & {
      streaks: { currentStreak: number; longestStreak: number };
    }>(response);
  }

  async getCompletions(habitId: string, params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<HabitCompletion>> {
    const response = await this.client.get(`/api/completions/${habitId}`, { params });
    return this.handleResponse<PaginatedResponse<HabitCompletion>>(response);
  }

  async deleteCompletion(completionId: string): Promise<{
    streaks: { currentStreak: number; longestStreak: number };
  }> {
    const response = await this.client.delete(`/api/completions/${completionId}`);
    return this.handleResponse<{
      streaks: { currentStreak: number; longestStreak: number };
    }>(response);
  }

  async getCompletionsByDateRange(params: {
    startDate: string;
    endDate: string;
    habitIds?: string[];
  }): Promise<HabitCompletion[]> {
    const response = await this.client.get('/api/completions/range', { params });
    return this.handleResponse<HabitCompletion[]>(response);
  }

  async getCalendarData(year: number, month: number): Promise<CalendarData> {
    const response = await this.client.get('/api/completions/calendar', {
      params: { year, month }
    });
    return this.handleResponse<CalendarData>(response);
  }

  // Analytics
  async getAnalytics(): Promise<{
    weeklyProgress: Array<{ day: string; completed: number; total: number }>;
    habitPerformance: Array<{ name: string; completion: number; currentStreak: number; longestStreak: number }>;
    goalTypeDistribution: Array<{ type: string; count: number; color: string }>;
    monthlyTrend: Array<{ week: string; completion: number }>;
    topStreaks: Array<{ name: string; streak: number }>;
    summary: {
      totalHabits: number;
      activeHabits: number;
      habitsOnStreak: number;
      habitsAtRisk: number;
      todayCompletions: number;
      weeklyCompletionRate: number;
    };
  }> {
    const response = await this.client.get('/api/analytics');
    return this.handleResponse(response);
  }

  // Health check
  async healthCheck(): Promise<{ message: string; environment: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();

export const api = axios.create({
  baseURL: ((process.env.NEXT_PUBLIC_API_URL ?? '') || '') + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
