import mongoose, { Schema } from 'mongoose';

export type GoalType = 'daily' | 'weekly' | 'monthly';
export type GoalLevel = 'standalone' | 'month' | 'week' | 'day';

export interface IGoalPeriod {
  year?: number;
  month?: number;       // 1–12
  weekOfMonth?: number; // 1–5
  daysOfWeek?: number[]; // 0=Sun … 6=Sat
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface IHabit {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  goalType: GoalType;
  targetCount: number;
  startDate: Date;
  active: boolean;
  // Hierarchy fields
  level: GoalLevel;
  parentId?: mongoose.Types.ObjectId;
  period?: IGoalPeriod;
  createdAt: Date;
  updatedAt: Date;
}

const goalPeriodSchema = new Schema<IGoalPeriod>(
  {
    year: { type: Number, min: 2000, max: 2100 },
    month: { type: Number, min: 1, max: 12 },
    weekOfMonth: { type: Number, min: 1, max: 5 },
    daysOfWeek: {
      type: [Number],
      validate: {
        validator: (v: number[]) => v.every((d) => d >= 0 && d <= 6),
        message: 'daysOfWeek must be integers 0–6',
      },
    },
    dateRange: {
      start: { type: Date },
      end: { type: Date },
    },
  },
  { _id: false }
);

const habitSchema = new Schema<IHabit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    goalType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    targetCount: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    // --- Hierarchy ---
    level: {
      type: String,
      enum: ['standalone', 'month', 'week', 'day'],
      required: true,
      default: 'standalone',
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Habit',
      default: null,
      index: true,
    },
    period: {
      type: goalPeriodSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common query patterns
habitSchema.index({ userId: 1, active: 1, createdAt: -1 });
habitSchema.index({ userId: 1, goalType: 1, active: 1 });
habitSchema.index({ userId: 1, createdAt: -1 });
habitSchema.index({ goalType: 1, active: 1 });
habitSchema.index({ active: 1, createdAt: -1 });
habitSchema.index({ userId: 1, level: 1, active: 1 });
habitSchema.index({ parentId: 1 });

// Single-field indexes
habitSchema.index({ userId: 1 });
habitSchema.index({ goalType: 1 });
habitSchema.index({ active: 1 });
habitSchema.index({ createdAt: -1 });

// Text index for search functionality
habitSchema.index(
  { name: 'text', description: 'text' },
  { weights: { name: 10, description: 1 } }
);

export const Habit = mongoose.model<IHabit>('Habit', habitSchema);