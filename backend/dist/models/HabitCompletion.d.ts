import mongoose from 'mongoose';
export interface IHabitCompletion {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    habitId: mongoose.Types.ObjectId;
    completedAt: Date;
    date: Date;
    createdAt: Date;
}
export declare const HabitCompletion: mongoose.Model<IHabitCompletion, {}, {}, {}, mongoose.Document<unknown, {}, IHabitCompletion, {}, {}> & IHabitCompletion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=HabitCompletion.d.ts.map