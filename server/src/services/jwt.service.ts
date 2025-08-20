import jwt from 'jsonwebtoken';
import { IUser } from '../models/User.model';

interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
}

export class JWTService {
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private static readonly ACCESS_TOKEN_EXPIRE = process.env.JWT_EXPIRE || '15m';
  private static readonly REFRESH_TOKEN_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

  static generateAccessToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRE,
    });
  }

  static generateRefreshToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRE,
    });
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.ACCESS_TOKEN_SECRET) as TokenPayload;
  }

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