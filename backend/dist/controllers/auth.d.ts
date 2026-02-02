import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const signup: (req: any, res: Response) => Promise<void>;
export declare const login: (req: any, res: Response) => Promise<void>;
export declare const refreshToken: (req: any, res: Response) => Promise<void>;
export declare const getProfile: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map