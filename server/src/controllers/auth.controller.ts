// Controller functions for authentication endpoints.
// In simple English:
// - Login:
//   * Some roles (store owner, cashier, sales rep) need a 6-digit OTP by email before we issue tokens.
//   * Others get tokens directly after password is verified.
// - Forgot Password:
//   * Old way: directly email reset link.
//   * New safer way: first email a 6-digit code (OTP). After user verifies this code, we email the reset link.
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.model';
import { JWTService } from '../services/jwt.service';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendOtpEmail, sendResetOtpEmail } from '../services/email.service';
import { toCanonicalRole, requiresOtpForLogin } from '../utils/roles';

export class AuthController {
  // Face login: receive embedding and match against users
  static async loginFace(req: Request, res: Response, next: NextFunction) {
    try {
      const { embedding } = req.body as { embedding?: number[] };
      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        return res.status(400).json({ success: false, message: 'Face embedding is required' });
      }

      // Fetch users that have stored embeddings
      const users = await User.find({ faceEmbedding: { $exists: true, $type: 'array' } });
      if (!users.length) {
        return res.status(404).json({ success: false, message: 'No users with face data' });
      }

      // Compute cosine similarity and find best match
      const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * (b[i] || 0), 0);
      const embA = embedding;
      const normA = norm(embA);
      let bestUser: typeof users[number] | null = null;
      let bestScore = -1;

      for (const u of users) {
        const embB = (u as any).faceEmbedding as number[] | undefined;
        if (!embB || embB.length !== embA.length) continue;
        const score = dot(embA, embB) / (normA * norm(embB) || 1);
        if (score > bestScore) {
          bestScore = score;
          bestUser = u;
        }
      }

      // Strict threshold to reduce false accepts (cosine similarity close to 1 is more similar)
      const COSINE_THRESHOLD = Number(process.env.FACE_COSINE_THRESHOLD || 0.9);
      if (!bestUser || bestScore < COSINE_THRESHOLD) {
        return res.status(401).json({ success: false, message: 'Face not recognized' });
      }

      // Enforce OTP after face match: do NOT issue tokens here
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      bestUser.otpCode = otp;
      bestUser.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
      bestUser.otpAttempts = (bestUser.otpAttempts || 0) + 1;
      await bestUser.save();
      const emailResult = await sendOtpEmail(bestUser.email, otp);
      const emailFailed = !emailResult?.ok;

      return res.json({
        success: true,
        message: 'Face matched. OTP required to complete login',
        data: {
          requiresOtp: true,
          user: { id: bestUser._id, username: bestUser.username, role: toCanonicalRole(bestUser.role) || bestUser.role },
          similarity: bestScore,
          emailSent: !!emailResult?.ok,
          emailError: emailResult?.error,
          emailPreviewUrl: (emailResult as any)?.preview,
          ...(emailFailed ? { debugOtp: otp } : {}),
        },
      });
    } catch (error) {
      return next(error);
    }
  }
  // Password reset via OTP flow
  static async passwordResetInit(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, username } = req.body as { email?: string; username?: string };
      const identifier = email || username;
      const user = identifier ? await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }) : null;
      if (!user || !user.isActive) {
        // Do not reveal whether user exists
        return res.json({ success: true, message: 'If the account exists, an OTP was sent.' });
      }
      // Throttle and reuse unexpired OTP
      const now = Date.now();
      const hasActive = user.resetOtpExpires && user.resetOtpExpires.getTime() > now && user.resetOtpCode;
      if (hasActive) {
        if ((user.resetOtpAttempts || 0) >= 5) {
          return res.status(429).json({ success: false, message: 'Too many requests. Please wait until the current code expires.' });
        }
        user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
        await user.save();
        const sent = await sendResetOtpEmail(user.email, user.resetOtpCode!);
        return res.json({ success: true, message: sent.ok ? 'OTP resent' : 'OTP generated', data: { emailSent: !!sent.ok, emailPreviewUrl: (sent as any).preview } });
      }
  // Issue new code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetOtpCode = otp;
      user.resetOtpExpires = new Date(now + 10 * 60 * 1000); // 10m
      user.resetOtpAttempts = 1;
      await user.save();
      const sent = await sendResetOtpEmail(user.email, otp);
      return res.json({ success: true, message: sent.ok ? 'OTP sent' : 'OTP generated', data: { emailSent: !!sent.ok, emailPreviewUrl: (sent as any).preview } });
    } catch (err) {
      return next(err);
    }
  }

  static async passwordResetVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, username, otp } = req.body as { email?: string; username?: string; otp: string };
      const identifier = email || username;
      const user = identifier ? await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }) : null;
      if (!user || !user.resetOtpCode || !user.resetOtpExpires) {
        return res.status(400).json({ success: false, message: 'OTP not requested' });
      }
      if (user.resetOtpExpires.getTime() < Date.now()) {
        user.resetOtpCode = undefined;
        user.resetOtpExpires = undefined;
        await user.save();
        return res.status(400).json({ success: false, message: 'OTP expired' });
      }
      if (otp !== user.resetOtpCode) {
        return res.status(401).json({ success: false, message: 'Invalid OTP' });
      }
  // Success: clear reset OTP and send reset link
      user.resetOtpCode = undefined;
      user.resetOtpExpires = undefined;
      user.resetOtpAttempts = 0;
      // Issue a reset token like forgotPassword
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30m
      await user.save();
  const appUrl = process.env.APP_URL || 'http://localhost:5173'; // client app URL for reset page
      const resetUrl = `${appUrl}/reset-password/${resetToken}`;
      const emailRes = await sendPasswordResetEmail(user.email, resetUrl);
      return res.json({ success: true, message: emailRes.ok ? 'Reset link sent' : 'Reset link generated', data: { resetUrl, emailSent: !!emailRes.ok } });
    } catch (err) {
      return next(err);
    }
  }
  // Register new user
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, firstName, lastName, role, phone, faceEmbedding } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists',
        });
      }

    // Create new user (default role is cashier if none provided)
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        role: role || 'cashier',
        phone,
        ...(Array.isArray(faceEmbedding) && faceEmbedding.length ? { faceEmbedding } : {}),
      });

      await user.save();

    // Generate tokens for the new user
  const { accessToken, refreshToken } = JWTService.generateTokenPair(user);

      // Save refresh token to database
      user.refreshToken = refreshToken;
      await user.save();

  // Set refresh token in httpOnly cookie so JS cannot read it (safer)
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        // Strict cookies are not sent on cross-site XHR; keep strict but also return token in body for dev fallback
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

  return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            language: user.language,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  // Login user
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password, rememberMe } = req.body;

      // Find user by username or email
      const user = await User.findOne({
        $or: [{ username }, { email: username }],
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials or account inactive',
        });
      }

      // Check password (supports legacy plain-text records by migrating them)
      let isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        const currentPasswordValue = (user as any).password as string;
        const looksHashed = typeof currentPasswordValue === 'string' && currentPasswordValue.startsWith('$2');

        // If the stored password is not a bcrypt hash and matches the provided password, migrate it
        if (!looksHashed && currentPasswordValue === password) {
          user.password = password; // pre-save hook will hash
          await user.save();
          isPasswordValid = true;
        }
      }

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // If role requires OTP (store_owner, cashier, sales_rep), enforce OTP step before issuing tokens
    if (requiresOtpForLogin(user.role)) {
        const needsNewOtp = !user.otpCode || !user.otpExpires || user.otpExpires.getTime() < Date.now();
        let emailResult: any = null;
        
        if (needsNewOtp) {
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          user.otpCode = otp;
          user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
          user.otpAttempts = (user.otpAttempts || 0) + 1;
          await user.save();
        }
        
        // Always send the OTP email (even if reusing existing OTP)
        emailResult = await sendOtpEmail(user.email, user.otpCode!);
        console.log('[auth] OTP email attempt', { 
          user: user.username, 
          sent: emailResult.ok, 
          email: user.email, 
          newOtp: needsNewOtp,
          otp: user.otpCode, 
          error: emailResult.ok ? undefined : emailResult.error 
        });
        
        // If email delivery failed, include OTP in response so frontend can show it
        const emailFailed = !emailResult?.ok;
        
        return res.json({
          success: true,
          message: 'OTP required',
          data: { requiresOtp: true, user: { id: user._id, username: user.username, role: toCanonicalRole(user.role) || user.role }, emailSent: Boolean(emailResult?.ok), emailError: emailResult?.error, emailPreviewUrl: emailResult?.preview, ...(emailFailed || process.env.DEBUG_SHOW_OTP ? { debugOtp: user.otpCode } : {}) }
        });
      }

  // No OTP required: proceed normally
      user.lastLogin = new Date();
      const { accessToken, refreshToken } = JWTService.generateTokenPair(user);
      user.refreshToken = refreshToken;
      await user.save();
    // Choose cookie lifetime based on Remember Me
  const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: cookieMaxAge,
      });
      return res.json({
        success: true,
        message: 'Login successful',
        data: { user: { id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, language: user.language, avatar: user.avatar }, accessToken, refreshToken }
      });
    } catch (error) {
      return next(error);
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      // Accept refresh token from httpOnly cookie, Authorization bearer, header, or body (dev fallback)
  const cookieToken = req.cookies?.refreshToken;
  const authHeader = req.headers.authorization?.split(' ')[1];
  const headerToken = (req.headers['x-refresh-token'] as string) || authHeader;
  const bodyToken: string | undefined = (req.body as any)?.refreshToken;
  const refreshToken = cookieToken || headerToken || bodyToken;

  if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not provided',
        });
      }

      // Verify refresh token
      const decoded = JWTService.verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }

    // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = JWTService.generateTokenPair(user);

      // Update refresh token in database
      user.refreshToken = newRefreshToken;
      await user.save();

    // Set new refresh token in cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

    return res.json({
        success: true,
        data: {
      accessToken,
      refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  // Logout
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.cookies;

      if (refreshToken) {
        // Clear refresh token from database
        await User.findOneAndUpdate(
          { refreshToken },
          { refreshToken: null }
        );
      }

    // Clear cookie
      res.clearCookie('refreshToken');

      return res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      return next(error);
    }
  }

  // Forgot password
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

    // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Save reset token to user
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await user.save();

  const appUrl = process.env.APP_URL || 'http://localhost:5173'; // client app URL
      const resetUrl = `${appUrl}/reset-password/${resetToken}`;
      const result = await sendPasswordResetEmail(email, resetUrl);

      return res.json({
        success: true,
        message: result.ok ? 'Password reset email sent' : 'Password reset token generated',
        data: {
          // Only include raw token if email not configured
          ...(result.ok ? {} : { resetToken }),
          resetUrl,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
        });
      }

  // Update password and invalidate sessions
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      // Invalidate existing sessions by clearing refresh token and mark password change time
      user.refreshToken = null;
      (user as any).passwordUpdatedAt = new Date();
      await user.save();

      return res.json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error) {
      return next(error);
    }
  }

  // Get current user
  static async getCurrentUser(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user.userId).select('-password -refreshToken');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      return next(error);
    }
  }

  // Login OTP phase 1: verify credentials and send OTP (for roles requiring OTP)
  static async adminLoginInitiate(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ $or: [{ username }, { email: username }] });
      if (!user || !requiresOtpForLogin(user.role) || !user.isActive) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const valid = await user.comparePassword(password);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
  // Rate-limit OTP requests: lock if >5 in 30 mins and current code not expired
      if (user.otpAttempts && user.otpAttempts >= 5 && user.otpExpires && user.otpExpires.getTime() > Date.now()) {
        return res.status(429).json({ success: false, message: 'Too many OTP requests. Please wait until current code expires.' });
      }
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otpCode = otp;
      user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      const sent = await sendOtpEmail(user.email, otp);
      return res.json({ success: true, message: sent.ok ? 'OTP sent' : 'OTP generated', data: { requiresOtp: true } });
    } catch (err) {
      return next(err);
    }
  }

  // Login OTP phase 2: verify OTP and issue tokens (for roles requiring OTP)
  static async adminLoginVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, otp, rememberMe } = req.body;
      const user = await User.findOne({ $or: [{ username }, { email: username }] });
      if (!user || !requiresOtpForLogin(user.role) || !user.otpCode || !user.otpExpires) {
        return res.status(400).json({ success: false, message: 'OTP not requested' });
      }
      if (user.otpExpires.getTime() < Date.now()) {
        user.otpCode = undefined;
        user.otpExpires = undefined;
        await user.save();
        return res.status(400).json({ success: false, message: 'OTP expired' });
      }
      if (otp !== user.otpCode) {
        return res.status(401).json({ success: false, message: 'Invalid OTP' });
      }
  // Success -> clear OTP and login
      user.otpCode = undefined;
      user.otpExpires = undefined;
      user.otpAttempts = 0;
      user.lastLogin = new Date();
      const { accessToken, refreshToken } = JWTService.generateTokenPair(user);
      user.refreshToken = refreshToken;
      await user.save();
      const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: cookieMaxAge,
      });
  return res.json({ success: true, message: 'Login successful', data: { user: { id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, role: toCanonicalRole(user.role) || user.role }, accessToken, refreshToken } });
    } catch (err) {
      return next(err);
    }
  }
}
