import mongoose, { Schema } from 'mongoose';

export interface IHabitCompletion {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  habitId: mongoose.Types.ObjectId;
  completedAt: Date;
  date: Date; // Normalized date (start of day in user's timezone)
  createdAt: Date;
}

const habitCompletionSchema = new Schema<IHabitCompletion>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  habitId: {
    type: Schema.Types.ObjectId,
    ref: 'Habit',
    required: true,
    index: true
  },
  completedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  date: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common query patterns
habitCompletionSchema.index({ userId: 1, habitId: 1, date: -1 }); // User's specific habit history (newest first)
habitCompletionSchema.index({ userId: 1, date: -1 }); // User's calendar view (newest first)
habitCompletionSchema.index({ habitId: 1, date: -1 }); // Streak calculations (newest first)
habitCompletionSchema.index({ userId: 1, date: 1, habitId: 1 }); // Unique constraint for preventing duplicates

// Single-field indexes for filtering
habitCompletionSchema.index({ userId: 1 });
habitCompletionSchema.index({ habitId: 1 });
habitCompletionSchema.index({ date: -1 }); // For global queries
habitCompletionSchema.index({ createdAt: -1 }); // For recent activity queries

// Text index for search functionality (if needed)
// habitCompletionSchema.index({ userId: 1, 'habit.name': 'text' });

export const HabitCompletion = mongoose.model<IHabitCompletion>('HabitCompletion', habitCompletionSchema);