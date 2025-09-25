// Express middleware that checks the access token and attaches user info to the request.
// In simple English:
// - We read the bearer token from the Authorization header.
// - If valid, we attach the decoded payload to req.user.
// - We also normalize the role so legacy 'admin' becomes 'store_owner'.
import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';
import { normalizeAllowedRoles, toCanonicalRole } from '../utils/roles';

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
  // Expect an Authorization: Bearer <token> header
  const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token not provided',
      });
    }

  // Validate token and store the decoded payload on req.user
  const decoded = JWTService.verifyAccessToken(token);
  // Normalize legacy 'admin' -> 'store_owner' for downstream checks
  req.user = { ...decoded, role: toCanonicalRole(decoded.role) || decoded.role } as any;
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

// Ensure the user has one of the allowed roles
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const allow = normalizeAllowedRoles(roles) || roles;
    const role = toCanonicalRole(req.user.role) || req.user.role;
    if (!allow.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions',
      });
    }

    return next();
  };
};