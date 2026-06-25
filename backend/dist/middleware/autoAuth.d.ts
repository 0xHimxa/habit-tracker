import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare const seedDefaultUser: () => Promise<string>;
export declare const autoAuth: (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=autoAuth.d.ts.map