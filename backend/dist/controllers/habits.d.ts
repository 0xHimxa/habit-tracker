import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const createHabit: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getHabits: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getGoals: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getGoalTree: (req: AuthRequest, res: Response) => Promise<void>;
export declare const autoBreakdown: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getHabitById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateHabit: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteHabit: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=habits.d.ts.map