import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthRequest } from './auth';

const DEFAULT_USER = {
  email: 'default@habittracker.local',
  password: 'DefaultPass123',
  name: 'Default User',
  timezone: 'UTC',
};

let defaultUserId: string | null = null;

export const seedDefaultUser = async (): Promise<string> => {
  let user = await User.findOne({ email: DEFAULT_USER.email });
  if (!user) {
    user = new User(DEFAULT_USER);
    await user.save();
    console.log('✅ Default user created');
  }
  defaultUserId = user._id.toString();
  return defaultUserId;
};

export const autoAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!defaultUserId) {
    await seedDefaultUser();
  }
  const user = await User.findById(defaultUserId).select('email timezone');
  if (user) {
    req.user = {
      id: user._id.toString(),
      email: user.email,
      timezone: user.timezone,
    };
  }
  next();
};
