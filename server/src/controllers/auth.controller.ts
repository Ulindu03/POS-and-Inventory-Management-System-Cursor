import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User.model';
import { JWTService } from '../services/jwt.service';
import crypto from 'crypto';

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, firstName, lastName, role, phone } = req.body;

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

      // Create new user
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        role: role || 'cashier',
        phone,
      });

      await user.save();

      // Generate tokens
      const { accessToken, refreshToken } = JWTService.generateTokenPair(user);

      // Save refresh token to database
      user.refreshToken = refreshToken;
      await user.save();

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
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
        },
      });
    } catch (error) {
      next(error);
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

      // Update last login
      user.lastLogin = new Date();

      // Generate tokens
      const { accessToken, refreshToken } = JWTService.generateTokenPair(user);

      // Save refresh token to database
      user.refreshToken = refreshToken;
      await user.save();

      // Set refresh token in httpOnly cookie
      const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: cookieMaxAge,
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            language: user.language,
            avatar: user.avatar,
          },
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.cookies;

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

      res.json({
        success: true,
        data: {
          accessToken,
        },
      });
    } catch (error) {
      next(error);
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

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
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

      // In production, send email with reset link
      // For now, return the token (remove in production)
      res.json({
        success: true,
        message: 'Password reset token generated',
        data: {
          resetToken, // Remove this in production
          resetUrl: `http://localhost:5173/reset-password/${resetToken}`,
        },
      });
    } catch (error) {
      next(error);
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

      // Update password
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error) {
      next(error);
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

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}
