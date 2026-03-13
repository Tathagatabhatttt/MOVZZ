import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwt.service';

declare global {
  namespace Express {
    interface Request {
      provider?: {
        providerId: string;
        phone: string;
      };
    }
  }
}

export function authenticateProvider(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Authorization token required' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload.role !== 'provider' || !payload.providerId) {
      res.status(403).json({ success: false, error: 'Provider access required' });
      return;
    }

    req.provider = {
      providerId: payload.providerId,
      phone: payload.phone,
    };

    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
