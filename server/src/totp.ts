
import crypto from 'crypto';
import { Buffer } from 'buffer';

const DIGITS = 6;
const PERIOD = 30;
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input: string): Buffer {
    let bits = 0;
    let value = 0;
    let index = 0;
    const output = new Uint8Array(Math.ceil(input.length * 5 / 8));

    for (let i = 0; i < input.length; i++) {
        const val = BASE32_CHARS.indexOf(input[i].toUpperCase());
        if (val === -1) continue;

        value = (value << 5) | val;
        bits += 5;

        if (bits >= 8) {
            output[index++] = (value >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return Buffer.from(output.slice(0, index));
}

function base32Encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;

        while (bits >= 5) {
            output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_CHARS[(value << (5 - bits)) & 31];
    }

    return output;
}

export const generateSecret = (length = 20) => {
    const randomBuffer = crypto.randomBytes(length);
    return base32Encode(randomBuffer);
};

export const generateHOTP = (secret: string, counter: number): string => {
    const decodedSecret = base32Decode(secret);
    const buffer = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) {
        buffer[i] = counter & 0xff;
        counter = counter >>> 8;
    }

    const hmac = crypto.createHmac('sha1', decodedSecret);
    hmac.update(buffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0xf;
    const code = (digest[offset] & 0x7f) << 24 |
        (digest[offset + 1] & 0xff) << 16 |
        (digest[offset + 2] & 0xff) << 8 |
        (digest[offset + 3] & 0xff);

    return (code % 10 ** DIGITS).toString().padStart(DIGITS, '0');
};

export const generateTOTP = (secret: string, window = 0): string => {
    const counter = Math.floor(Date.now() / 1000 / PERIOD) + window;
    return generateHOTP(secret, counter);
};

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

export const generateBackupCodes = (count = 8): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
};
