
import crypto from 'crypto';
import { Buffer } from 'buffer';

/**
 * Robust TOTP implementation compatible with Google Authenticator
 */

const DIGITS = 6;
const PERIOD = 30;

// Base32 decoding with padding handling
function base32Decode(input: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let length = input.length;
    let bits = 0;
    let value = 0;
    let index = 0;
    
    // Remove padding char
    input = input.replace(/=+$/, '');
    length = input.length;

    const output = Buffer.alloc(Math.ceil((length * 5) / 8));

    for (let i = 0; i < length; i++) {
        const char = input.charAt(i).toUpperCase();
        const val = alphabet.indexOf(char);
        
        if (val === -1) continue;

        value = (value << 5) | val;
        bits += 5;

        if (bits >= 8) {
            output[index++] = (value >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return output.slice(0, index);
}

// Generate a random Base32 secret
export const generateSecret = (length = 20): string => {
    const randomBuffer = crypto.randomBytes(length);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let output = '';
    let bits = 0;
    let value = 0;

    for (let i = 0; i < randomBuffer.length; i++) {
        value = (value << 8) | randomBuffer[i];
        bits += 8;

        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
};

// Generate HMAC-based One Time Password
export const generateHOTP = (secret: string, counter: number): string => {
    const decodedSecret = base32Decode(secret);
    
    // Create an 8-byte buffer for the counter
    const buffer = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) {
        buffer[i] = counter & 0xff;
        counter = counter >>> 8;
    }

    const hmac = crypto.createHmac('sha1', decodedSecret);
    hmac.update(buffer);
    const digest = hmac.digest();

    // Dynamic truncation
    const offset = digest[digest.length - 1] & 0xf;
    const code = (digest[offset] & 0x7f) << 24 |
        (digest[offset + 1] & 0xff) << 16 |
        (digest[offset + 2] & 0xff) << 8 |
        (digest[offset + 3] & 0xff);

    return (code % 10 ** DIGITS).toString().padStart(DIGITS, '0');
};

// Generate Time-based One Time Password
export const generateTOTP = (secret: string, window = 0): string => {
    const counter = Math.floor(Date.now() / 1000 / PERIOD) + window;
    return generateHOTP(secret, counter);
};

// Verify a token against a secret with a window allowance
export const verifyTOTP = (token: string, secret: string, window = 1): boolean => {
    if (!token || !secret) return false;
    
    // Check current, previous, and next windows to account for slight clock drift
    for (let i = -window; i <= window; i++) {
        const generated = generateTOTP(secret, i);
        if (generated === token) {
            return true;
        }
    }
    return false;
};

// Generate backup codes for account recovery
export const generateBackupCodes = (count = 8): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
};
