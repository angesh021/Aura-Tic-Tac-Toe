
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

// Ensure env vars are loaded from root if this file is accessed directly
dotenv.config({ path: path.resolve((process as any).cwd(), '../.env') });

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET is not defined in environment variables.");
    if (process.env.NODE_ENV === 'production') {
        (process as any).exit(1);
    }
}

// bcrypt automatically handles salt generation and storage within the hash
export const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 10; 
    return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

export const createToken = (user: { id: string; email: string; }): string => {
    if (!JWT_SECRET) throw new Error("JWT Secret missing");
    return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: '7d',
    });
};

export const verifyToken = (token: string): { userId: string, email: string } => {
    if (!JWT_SECRET) throw new Error("JWT Secret missing");
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded as { userId: string, email: string };
    } catch (error) {
        throw new Error("Invalid or expired token.");
    }
};
