import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { z } from 'zod';
import { 
  User, 
  Habit, 
  HabitCompletion, 
  CalendarData, 
  ApiResponse, 
  PaginatedResponse,
  AuthResponse,
  LoginInput,
  SignupInput,
  CreateHabitInput,
  UpdateHabitInput,
  CreateCompletionInput
} from '@/types';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (this.refreshToken) {
            try {
              const response = await this.refreshAccessToken();
              this.accessToken = response.accessToken;
              this.refreshToken = response.refreshToken;
              
              // Store tokens in localStorage
              localStorage.setItem('accessToken', this.accessToken);
              localStorage.setItem('refreshToken', this.refreshToken);

              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
              return this.client(originalRequest);
            } catch (refreshError) {
              // Refresh failed, clear tokens and redirect to login
              this.clearTokens();
              window.location.href = '/auth/login';
              return Promise.reject(refreshError);
            }
          } else {
            // No refresh token, redirect to login
            this.clearTokens();
            window.location.href = '/auth/login';
          }
        }

        return Promise.reject(error);
      }
    );

    // Load tokens from localStorage on init
    this.loadTokens();
  }

  private loadTokens(): void {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  private storeTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  private async refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await this.client.post('/api/auth/refresh', {
      refreshToken: this.refreshToken,
    });
    
    return response.data.data;
  }

  private async handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): Promise<T> {
    if (!response.data.success) {
      throw new Error(response.data.error || 'API request failed');
    }
    
    return response.data.data!;
  }

  // Authentication methods
  async login(credentials: LoginInput): Promise<AuthResponse> {
    const response = await this.client.post('/api/auth/login', credentials);
    const data = await this.handleResponse<AuthResponse>(response);
    
    this.storeTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async signup(userData: SignupInput): Promise<AuthResponse> {
    const response = await this.client.post('/api/auth/signup', userData);
    const data = await this.handleResponse<AuthResponse>(response);
    
    this.storeTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async getProfile(): Promise<User> {
    const response = await this.client.get('/api/auth/profile');
    return this.handleResponse<User>(response);
  }

  async logout(): Promise<void> {
    this.clearTokens();
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
    return this.handleResponse<PaginatedResponse<Habit>>(response);
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

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Create axios instance for backward compatibility with components using `api.get()` etc.
export const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Export hooks for easy usage
export const useAuth = () => {
  return {
    login: (credentials: LoginInput) => apiClient.login(credentials),
    signup: (userData: SignupInput) => apiClient.signup(userData),
    logout: () => apiClient.logout(),
    getProfile: () => apiClient.getProfile(),
    isAuthenticated: () => apiClient.isAuthenticated(),
  };
};

export const useHabits = () => {
  return {
    getHabits: (params?: any) => apiClient.getHabits(params),
    getHabit: (habitId: string) => apiClient.getHabit(habitId),
    createHabit: (habitData: CreateHabitInput) => apiClient.createHabit(habitData),
    updateHabit: (habitId: string, habitData: UpdateHabitInput) => apiClient.updateHabit(habitId, habitData),
    deleteHabit: (habitId: string) => apiClient.deleteHabit(habitId),
  };
};

export const useCompletions = () => {
  return {
    createCompletion: (completionData: CreateCompletionInput) => apiClient.createCompletion(completionData),
    getCompletions: (habitId: string, params?: any) => apiClient.getCompletions(habitId, params),
    deleteCompletion: (completionId: string) => apiClient.deleteCompletion(completionId),
    getCompletionsByDateRange: (params: any) => apiClient.getCompletionsByDateRange(params),
    getCalendarData: (year: number, month: number) => apiClient.getCalendarData(year, month),
  };
};