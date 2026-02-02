import { Router } from 'express';
import { signup, login, refreshToken, getProfile } from '../controllers/auth';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { loginSchema, signupSchema, refreshTokenSchema } from '../utils/authValidators';

const router = Router();

router.post('/signup', validateRequest({ body: signupSchema }), signup);
router.post('/login', validateRequest({ body: loginSchema }), login);
router.post('/refresh', validateRequest({ body: refreshTokenSchema }), refreshToken);
router.get('/profile', authenticate, getProfile);

export default router;