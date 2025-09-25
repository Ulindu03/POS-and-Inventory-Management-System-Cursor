import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/User.model';
import { toCanonicalRole } from '../utils/roles';

// What we store inside tokens (keep it small and non-sensitive)
interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
}

// Helper to create and verify access/refresh tokens
export class JWTService {
  private static readonly ACCESS_TOKEN_SECRET: Secret = (process.env.JWT_SECRET || 'your-secret-key') as Secret;
  private static readonly REFRESH_TOKEN_SECRET: Secret = (process.env.JWT_REFRESH_SECRET || 'your-refresh-secret') as Secret;
  private static readonly ACCESS_TOKEN_EXPIRE: SignOptions['expiresIn'] = (process.env.JWT_EXPIRE || '15m') as SignOptions['expiresIn'];
  private static readonly REFRESH_TOKEN_EXPIRE: SignOptions['expiresIn'] = (process.env.JWT_REFRESH_EXPIRE || '7d') as SignOptions['expiresIn'];

  // Short-lived token used in Authorization header
  static generateAccessToken(user: IUser): string {
    const payload: TokenPayload = {
  userId: String(user._id),
      username: user.username,
      email: user.email,
      role: (toCanonicalRole(user.role) || user.role) as string,
    };

    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, { expiresIn: this.ACCESS_TOKEN_EXPIRE });
  }

  // Long-lived token used to mint new access tokens
  static generateRefreshToken(user: IUser): string {
    const payload: TokenPayload = {
  userId: String(user._id),
      username: user.username,
      email: user.email,
      role: (toCanonicalRole(user.role) || user.role) as string,
    };

    return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, { expiresIn: this.REFRESH_TOKEN_EXPIRE });
  }

  // Throws if invalid/expired
  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.ACCESS_TOKEN_SECRET) as TokenPayload;
  }

  // Throws if invalid/expired
  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, this.REFRESH_TOKEN_SECRET) as TokenPayload;
  }

  static generateTokenPair(user: IUser): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }
}