
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth';
import { logger } from './logger';

// By using declaration merging, we can extend the Express Request type globally.
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

// --- LOGGING MIDDLEWARE ---
export const requestLogger = (req: Request, res: Response, next: any) => {
    const start = Date.now();
    (res as any).on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${(req as any).method} ${(req as any).originalUrl}`, {
            status: (res as any).statusCode,
            duration: `${duration}ms`,
            ip: (req as any).ip || (req as any).socket?.remoteAddress,
            userAgent: (req as any).headers['user-agent']
        });
    });
    next();
};

export const authMiddleware = (req: Request, res: Response, next: any) => {
    const authHeader = (req as any).headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return (res as any).status(401).json({ message: 'Authorization token is required.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        (req as any).user = decoded; 
        next();
    } catch (error) {
        logger.warn(`Auth failed: Invalid token for IP ${(req as any).ip}`);
        return (res as any).status(401).json({ message: 'Invalid or expired token.' });
    }
};

// --- SECURITY MIDDLEWARE ---

// 1. Security Headers
export const securityHeaders = (req: Request, res: Response, next: any) => {
    (res as any).setHeader('X-Content-Type-Options', 'nosniff');
    (res as any).setHeader('X-Frame-Options', 'DENY');
    (res as any).setHeader('X-XSS-Protection', '1; mode=block');
    (res as any).setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
};

// 2. Rate Limiter (In-Memory)
// Note: In a distributed production env (like Kubernetes), use Redis for this.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export const rateLimiter = (windowMs: number, max: number) => {
  return (req: Request, res: Response, next: any) => {
    const ip = (req as any).ip || (req as any).connection?.remoteAddress || 'unknown';
    const now = Date.now();

    const record = rateLimitMap.get(ip) || { count: 0, lastReset: now };

    if (now - record.lastReset > windowMs) {
        record.count = 0;
        record.lastReset = now;
    }

    if (record.count >= max) {
        logger.warn(`Rate limit exceeded for IP: ${ip}`);
        return (res as any).status(429).json({ 
            message: `Too many requests. Please try again in ${Math.ceil(windowMs / 60000)} minutes.` 
        });
    }

    record.count += 1;
    rateLimitMap.set(ip, record);
    next();
  };
};
