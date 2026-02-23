// Defines all /auth endpoints.
// In simple English:
// - /login does normal login; if role needs OTP, it responds with requiresOtp=true instead of tokens.
// - /otp-login/* handles the two-step OTP login for store owner/cashier/sales_rep.
// - /forgot-password is the older direct reset link flow (kept for compatibility).
// - /password-reset/* is the new two-step reset: send OTP first, verify, then email reset link.
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { isSmtpConfigured, verifySmtpConnection, smtpDiagnostics, resetTransporter } from '../services/email.service';
import { authenticate } from '../middleware/auth.middleware';

// Optional: add validation if available later
const validateRequest = (_schema?: any) => (_req: any, _res: any, next: any) => next();
const authValidation: any = {};

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: User exists
 */
// Public routes
router.post('/register', validateRequest(authValidation?.register), AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, description: "username or email" }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
// Basic login and OTP flow (store owner, cashier, sales rep)
router.post('/login', validateRequest(authValidation?.login), AuthController.login);
// Face login using stored embeddings
router.post('/login-face', AuthController.loginFace);
router.post('/admin/login/init', AuthController.adminLoginInitiate);
router.post('/admin/login/verify', AuthController.adminLoginVerify);
// New canonical routes (generalized)
router.post('/otp-login/init', AuthController.adminLoginInitiate);
router.post('/otp-login/verify', AuthController.adminLoginVerify);
// Token utilities
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);
// Helper endpoints to check SMTP health in dev
router.get('/smtp-status', async (_req, res) => {
	const configured = isSmtpConfigured();
	const verify = configured ? await verifySmtpConnection() : { ok: false, error: 'not configured' };
	return res.json({ success: true, data: { configured, verify, diagnostics: smtpDiagnostics() } });
});

// Force a re-evaluation of transporter (useful after adding env vars without restart in some dev setups)
router.post('/smtp-reload', async (_req, res) => {
	resetTransporter();
	const configured = isSmtpConfigured();
	const verify = configured ? await verifySmtpConnection() : { ok: false, error: 'not configured' };
	return res.json({ success: true, message: 'SMTP reloaded', data: { configured, verify, diagnostics: smtpDiagnostics() } });
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Reset link generated (and emailed if SMTP configured)
 *       404:
 *         description: User not found
 */
router.post('/forgot-password', validateRequest(authValidation?.forgotPassword), AuthController.forgotPassword);

// Two-step reset: send OTP to email, then verify to send reset link
router.post('/password-reset/init', AuthController.passwordResetInit);
router.post('/password-reset/verify', AuthController.passwordResetVerify);

/**
 * @swagger
 * /api/auth/reset-password/{token}:
 *   post:
 *     summary: Reset password using a token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password/:token', validateRequest(authValidation?.resetPassword), AuthController.resetPassword);

// Protected routes
router.get('/me', authenticate, AuthController.getCurrentUser);

export default router;