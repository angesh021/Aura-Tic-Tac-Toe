
import crypto from 'crypto';
import { Buffer } from 'buffer';

const getKeys = () => {
    // Use MFA_ENCRYPTION_KEY if available, otherwise fallback to JWT_SECRET, or a hardcoded dev fallback.
    // In production, MFA_ENCRYPTION_KEY should be set.
    const RAW_KEY = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'unsafe_dev_fallback_key_32_bytes';
    // Ensure the key is exactly 32 bytes (256 bits) for AES-256
    const KEY = crypto.createHash('sha256').update(RAW_KEY).digest();
    return KEY;
};

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export const encrypt = (text: string): string => {
    if (!text) return '';
    try {
        const KEY = getKeys();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (e) {
        console.error("Encryption error:", e);
        return text; // Fallback to plaintext if encryption fails (prevents data loss, though less secure)
    }
};

export const decrypt = (text: string): string => {
    if (!text) return '';
    
    // Check if the text is in the expected format (IV:Ciphertext)
    // If not, assume it's legacy plaintext and return as is.
    if (!text.includes(':')) return text;

    try {
        const KEY = getKeys();
        const [ivHex, encryptedHex] = text.split(':');
        if (!ivHex || !encryptedHex) return text;

        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error("Decryption error:", e);
        return ''; // Fail safe
    }
};
