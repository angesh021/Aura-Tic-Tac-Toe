
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("Server Misconfiguration: JWT Secret missing");
    }
    return secret;
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
    const secret = getJwtSecret();
    return jwt.sign({ userId: user.id, email: user.email }, secret, {
        expiresIn: '7d',
    });
};

export const verifyToken = (token: string): { userId: string, email: string } => {
    const secret = getJwtSecret();
    try {
        const decoded = jwt.verify(token, secret);
        return decoded as { userId: string, email: string };
    } catch (error) {
        throw new Error("Invalid or expired token.");
    }
};
