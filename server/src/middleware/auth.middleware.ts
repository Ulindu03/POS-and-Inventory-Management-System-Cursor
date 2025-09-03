import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token not provided',
      });
    }

    const decoded = JWTService.verifyAccessToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    // Avoid noisy stack traces for routine expirations
    const err: any = error;
    if (err && (err.name === 'TokenExpiredError' || err.message?.includes('jwt expired'))) {
      res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token", error_description="The access token expired"');
      res.setHeader('X-Token-Expired', 'true');
      return res.status(401).json({ success: false, message: 'Access token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Alias for backward compatibility
export const authenticateToken = authenticate;

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions',
      });
    }

    return next();
  };
};