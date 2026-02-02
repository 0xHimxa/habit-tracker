import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const createCompletion: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCompletions: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteCompletion: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCompletionsByDateRange: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCalendarData: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=completions.d.ts.map