import mongoose from 'mongoose';
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
export declare const Habit: mongoose.Model<IHabit, {}, {}, {}, mongoose.Document<unknown, {}, IHabit, {}, {}> & IHabit & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Habit.d.ts.map