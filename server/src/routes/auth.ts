
import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { hashPassword, comparePassword, createToken } from '../auth';
import { authMiddleware, rateLimiter } from '../middleware';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService';
import { generateSecret, verifyTOTP, generateBackupCodes } from '../totp';
import { encrypt, decrypt } from '../encryption';
import { logger } from '../logger';
import { exclude, getQuestData } from '../utils/routeHelpers';

const router = Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper to get frontend URL consistently
const getFrontendUrl = () => {
    // Remove trailing slash if present
    const url = process.env.FRONTEND_URL || 'http://localhost:5173';
    return url.replace(/\/$/, '');
};

// ============================================================================
// PUBLIC AUTHENTICATION ROUTES
// ============================================================================

/**
 * POST /api/check-email
 * Checks if an email is already registered. Used for UI feedback.
 * Rate Limit: 20 requests per minute to prevent enumeration.
 */
router.post('/check-email', rateLimiter(60000, 20) as any, async (req: any, res: any) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });
    try {
        const count = await prisma.user.count({ where: { email } });
        res.json({ exists: count > 0 });
    } catch (e) {
        logger.error("Check email error", e);
        res.status(500).json({ message: "Check failed" });
    }
});

/**
 * POST /api/register
 * Creates a new user account.
 */
router.post('/register', rateLimiter(60000, 5) as any, async (req: any, res: any) => {
    const { email, password } = req.body;
    
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });
    if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid email format" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(409).json({ message: "Account already exists" });

        const hashedPassword = await hashPassword(password);
        const displayName = email.split('@')[0].substring(0, 15); // Default name
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const friendCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                displayName,
                avatar: 'avatar-1',
                elo: 1000,
                coins: 0, // Starting bonus removed so Welcome Bonus is the only source
                verificationToken,
                friendCode,
                questData: {
                    lastDailyReward: '',
                    dailyStreak: 0,
                    prestigeLevel: 0,
                    lastVisit: new Date().toISOString(),
                    lastPasswordChange: new Date().toISOString(), // Track password creation
                    welcomeBonus: 'available', // Grant new users the welcome bonus state
                    quests: []
                },
                inventory: ['avatar-1', 'theme-default', 'skin-classic', 'frame-none']
            }
        });

        const frontendUrl = getFrontendUrl();
        // Fire and forget email - logic inside logs the link to console for debugging
        sendVerificationEmail(email, displayName, `${frontendUrl}/?mode=verify&token=${verificationToken}`)
            .catch(e => logger.error("Failed to send verification email", e));

        res.json({ 
            message: "Registered successfully. Please verify your email.", 
            user: exclude(user, ['passwordHash', 'mfaSecret', 'verificationToken']) 
        });
    } catch (e) {
        logger.error("Register error", e);
        res.status(500).json({ message: "Registration failed due to server error." });
    }
});

/**
 * POST /api/login
 * Authenticates user. Returns JWT or MFA requirement.
 */
router.post('/login', rateLimiter(60000, 10) as any, async (req: any, res: any) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        const isValid = await comparePassword(password, user.passwordHash);
        if (!isValid) return res.status(401).json({ message: "Invalid credentials" });

        // Handle MFA
        if (user.mfaEnabled) {
            const tempToken = jwt.sign({ userId: user.id, type: 'mfa_temp' }, process.env.JWT_SECRET!, { expiresIn: '5m' });
            return res.json({ mfaRequired: true, tempToken });
        }

        // Update Last Visit
        const qData = getQuestData(user);
        await prisma.user.update({
            where: { id: user.id },
            data: { questData: { ...qData, lastVisit: new Date().toISOString() } }
        });

        const token = createToken(user);
        res.json({ token, user: exclude(user, ['passwordHash', 'mfaSecret', 'verificationToken']) });
    } catch (e) {
        logger.error("Login error", e);
        res.status(500).json({ message: "Login failed" });
    }
});

/**
 * POST /api/login/mfa
 * Verifies TOTP or Backup code during login process.
 */
router.post('/login/mfa', rateLimiter(60000, 5) as any, async (req: any, res: any) => {
    const { tempToken, code } = req.body;
    try {
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as any;
        if (decoded.type !== 'mfa_temp') throw new Error("Invalid token type");

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return res.status(400).json({ message: "User not found" });
        if (!user.mfaSecret && !user.mfaEnabled) return res.status(400).json({ message: "MFA not setup" });

        const secret = user.mfaSecret ? decrypt(user.mfaSecret) : '';
        let verified = false;

        // 1. Try TOTP
        if (secret && verifyTOTP(code, secret)) {
            verified = true;
        } 
        // 2. Try Backup Codes
        else {
             const qData = getQuestData(user);
             if (qData.mfaBackupCodes && Array.isArray(qData.mfaBackupCodes) && qData.mfaBackupCodes.includes(code)) {
                 verified = true;
                 // Consume backup code
                 const newCodes = qData.mfaBackupCodes.filter((c: string) => c !== code);
                 await prisma.user.update({
                     where: { id: user.id },
                     data: { questData: { ...qData, mfaBackupCodes: newCodes } }
                 });
             }
        }

        if (!verified) {
            return res.status(401).json({ message: "Invalid code" });
        }

        const token = createToken(user);
        res.json({ token, user: exclude(user, ['passwordHash', 'mfaSecret', 'verificationToken']) });
    } catch (e) {
        res.status(401).json({ message: "MFA session expired or invalid" });
    }
});

/**
 * POST /api/verify-email
 * Confirms email address using token from email link.
 */
router.post('/verify-email', async (req: any, res: any) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token required" });

    try {
        const user = await prisma.user.findFirst({ where: { verificationToken: token } });
        if (!user) return res.status(400).json({ message: "Invalid or expired token" });

        await prisma.user.update({
            where: { id: user.id },
            data: { 
                emailVerified: true,
                verificationToken: null // Consume token
            }
        });

        res.json({ success: true, message: "Email verified successfully" });
    } catch (e) {
        logger.error("Verification error", e);
        res.status(500).json({ message: "Verification failed" });
    }
});

/**
 * POST /api/request-password-reset
 * Initiates password reset flow.
 */
router.post('/request-password-reset', rateLimiter(60000, 3) as any, async (req: any, res: any) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        // Security: Always return success to prevent enumeration
        if (!user) return res.json({ message: "If account exists, email sent." });

        const resetToken = jwt.sign({ userId: user.id, type: 'reset' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
        
        const frontendUrl = getFrontendUrl();
        const resetLink = `${frontendUrl}/?resetToken=${resetToken}`;

        // Fire and forget email - logic inside logs the link to console for debugging
        sendPasswordResetEmail(email, user.displayName, resetLink)
            .catch(e => logger.error("Email failed", e));
        
        res.json({ message: "If account exists, email sent." });
    } catch (e) {
        logger.error("Reset request error", e);
        res.status(500).json({ message: "Request failed" });
    }
});

/**
 * POST /api/reset-password
 * Completes password reset flow.
 */
router.post('/reset-password', rateLimiter(60000, 3) as any, async (req: any, res: any) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) return res.status(400).json({ message: "Invalid data" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        if(decoded.type !== 'reset') throw new Error("Invalid token type");

        const hashedPassword = await hashPassword(newPassword);
        
        // Also fetch user to update questData
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) throw new Error("User not found");
        
        const qData = getQuestData(user);

        await prisma.user.update({
            where: { id: decoded.userId },
            data: { 
                passwordHash: hashedPassword,
                questData: { ...qData, lastPasswordChange: new Date().toISOString() }
            }
        });
        
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ message: "Invalid or expired token" });
    }
});

// ============================================================================
// PROTECTED PROFILE ROUTES
// ============================================================================

/**
 * GET /api/me
 * Retrieves current user profile.
 */
router.get('/me', authMiddleware, async (req: any, res: any) => {
    try {
        const user = await prisma.user.findUnique({ 
            where: { id: req.user?.userId },
            include: { clan: true } 
        });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(exclude(user, ['passwordHash', 'mfaSecret', 'verificationToken']));
    } catch (e) {
        res.status(500).json({ message: "Error fetching profile" });
    }
});

/**
 * PUT /api/me
 * Updates user profile details (displayName, bio, etc.).
 */
router.put('/me', authMiddleware, async (req: any, res: any) => {
    const allowed = ['displayName', 'avatar', 'theme', 'equippedTheme', 'equippedSkin', 'preferences', 'questData', 'bio', 'customStatus'];
    const updates = Object.keys(req.body)
        .filter(key => allowed.includes(key))
        .reduce((obj, key) => {
            obj[key] = req.body[key];
            return obj;
        }, {} as any);

    try {
        const user = await prisma.user.update({
            where: { id: req.user?.userId },
            data: updates
        });
        res.json(exclude(user, ['passwordHash', 'mfaSecret']));
    } catch (e) {
        logger.error("Update profile error", e);
        res.status(500).json({ message: "Failed to update profile" });
    }
});

/**
 * PUT /api/me/password
 * Changes user password while logged in.
 */
router.put('/me/password', authMiddleware, async (req: any, res: any) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Invalid password data" });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isValid = await comparePassword(currentPassword, user.passwordHash);
        if (!isValid) return res.status(401).json({ message: "Incorrect current password" });

        const hashedPassword = await hashPassword(newPassword);
        const qData = getQuestData(user);
        
        await prisma.user.update({
            where: { id: req.user?.userId },
            data: { 
                passwordHash: hashedPassword,
                questData: { ...qData, lastPasswordChange: new Date().toISOString() }
            }
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Failed to change password" });
    }
});

/**
 * DELETE /api/me
 * Permanently deletes the user account.
 */
router.delete('/me', authMiddleware, async (req: any, res: any) => {
    try {
        await prisma.match.deleteMany({ where: { userId: req.user?.userId } });
        await prisma.friendship.deleteMany({
            where: { OR: [{ senderId: req.user?.userId }, { receiverId: req.user?.userId }] }
        });
        await prisma.notification.deleteMany({ where: { userId: req.user?.userId } });
        await prisma.user.delete({ where: { id: req.user?.userId } });
        
        res.json({ success: true, message: "Account deleted" });
    } catch (e) {
        logger.error("Delete account error", e);
        res.status(500).json({ message: "Failed to delete account" });
    }
});

/**
 * POST /api/me/resend-verification
 * Resends verification email to the logged in user.
 */
router.post('/me/resend-verification', authMiddleware, rateLimiter(60000, 3) as any, async (req: any, res: any) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        if (!user) return res.status(404).json({ message: "User not found" });
        
        if (user.emailVerified) {
            return res.status(400).json({ message: "Email is already verified." });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        await prisma.user.update({
            where: { id: user.id },
            data: { verificationToken }
        });

        const frontendUrl = getFrontendUrl();
        const verifyLink = `${frontendUrl}/?mode=verify&token=${verificationToken}`;

        sendVerificationEmail(user.email, user.displayName, verifyLink)
            .catch(e => logger.error("Failed to resend verification email", e));

        res.json({ success: true, message: "Verification email sent." });
    } catch (e) {
        logger.error("Resend verification error", e);
        res.status(500).json({ message: "Failed to resend verification email" });
    }
});

// ============================================================================
// MFA MANAGEMENT
// ============================================================================

router.post('/me/mfa/setup', authMiddleware, async (req: any, res: any) => {
    try {
        const secret = generateSecret();
        const encryptedSecret = encrypt(secret);
        const backupCodes = generateBackupCodes();
        
        const userId = req.user?.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        if (!user) return res.status(404).json({ message: "User not found" });

        const qData = getQuestData(user);
        
        await prisma.user.update({
            where: { id: userId },
            data: { 
                mfaSecret: encryptedSecret, // Stored encrypted
                questData: { ...qData, mfaBackupCodes: backupCodes }
            }
        });

        // Generate QR Code URL
        const otpauth = `otpauth://totp/Aura:${user.email}?secret=${secret}&issuer=Aura`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;

        res.json({ secret, qr: qrUrl, backupCodes });
    } catch (e) {
        logger.error("MFA Setup Error", e);
        res.status(500).json({ message: "Failed to initiate MFA setup" });
    }
});

router.post('/me/mfa/verify', authMiddleware, async (req: any, res: any) => {
    const { code } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        if (!user || !user.mfaSecret) return res.status(400).json({ message: "MFA not initiated" });

        const secret = decrypt(user.mfaSecret);
        if (verifyTOTP(code, secret)) {
            await prisma.user.update({
                where: { id: req.user?.userId },
                data: { mfaEnabled: true }
            });
            res.json({ success: true });
        } else {
            res.status(400).json({ message: "Invalid code" });
        }
    } catch (e) {
        res.status(500).json({ message: "Verification failed" });
    }
});

router.delete('/me/mfa', authMiddleware, async (req: any, res: any) => {
    try {
        await prisma.user.update({
            where: { id: req.user?.userId },
            data: { mfaEnabled: false, mfaSecret: null }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Failed to disable MFA" });
    }
});

export default router;
