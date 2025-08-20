import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

// Optional: add validation if available later
const validateRequest = (schema?: any) => (req: any, res: any, next: any) => next();
const authValidation: any = {};

const router = Router();

// Public routes
router.post('/register', validateRequest(authValidation?.register), AuthController.register);
router.post('/login', validateRequest(authValidation?.login), AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', validateRequest(authValidation?.forgotPassword), AuthController.forgotPassword);
router.post('/reset-password/:token', validateRequest(authValidation?.resetPassword), AuthController.resetPassword);

// Protected routes
router.get('/me', authenticate, AuthController.getCurrentUser);

export default router;