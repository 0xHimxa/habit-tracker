import mongoose from 'mongoose';
export type GoalType = 'daily' | 'weekly' | 'monthly';
export type GoalLevel = 'standalone' | 'month' | 'week' | 'day';
export interface IGoalPeriod {
    year?: number;
    month?: number;
    weekOfMonth?: number;
    daysOfWeek?: number[];
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
    level: GoalLevel;
    parentId?: mongoose.Types.ObjectId;
    period?: IGoalPeriod;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Habit: mongoose.Model<IHabit, {}, {}, {}, mongoose.Document<unknown, {}, IHabit, {}, {}> & IHabit & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Habit.d.ts.map