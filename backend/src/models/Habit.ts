import mongoose, { Schema } from 'mongoose';

export type GoalType = 'daily' | 'weekly' | 'monthly';

export interface IHabit {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  goalType: GoalType;
  targetCount: number;
  startDate: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const habitSchema = new Schema<IHabit>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  goalType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  targetCount: {
    type: Number,
    required: true,
    min: 1,
    max: 1000
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common query patterns
habitSchema.index({ userId: 1, active: 1, createdAt: -1 }); // User's active habits (newest first)
habitSchema.index({ userId: 1, goalType: 1, active: 1 }); // User's habits by type
habitSchema.index({ userId: 1, createdAt: -1 }); // User's habits (newest first)
habitSchema.index({ goalType: 1, active: 1 }); // Global statistics
habitSchema.index({ active: 1, createdAt: -1 }); // Active habits globally

// Single-field indexes
habitSchema.index({ userId: 1 });
habitSchema.index({ goalType: 1 });
habitSchema.index({ active: 1 });
habitSchema.index({ createdAt: -1 });

// Text index for search functionality
habitSchema.index({ 
  name: 'text', 
  description: 'text' 
}, {
  weights: {
    name: 10,
    description: 1
  }
});

export const Habit = mongoose.model<IHabit>('Habit', habitSchema);