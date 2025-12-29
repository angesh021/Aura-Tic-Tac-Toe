
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Helper to determine safe sender
const getSafeSender = () => {
    const envEmail = process.env.RESEND_FROM_EMAIL;
    const defaultEmail = 'onboarding@resend.dev';

    if (!envEmail) return defaultEmail;

    // Fix: Resend 'resend.dev' domain only supports 'onboarding' user.
    // Sending as 'aura@resend.dev' or others will fail.
    if (envEmail.includes('@resend.dev') && !envEmail.startsWith('onboarding@')) {
        console.warn(`⚠️ Invalid Resend sender '${envEmail}'. Falling back to ${defaultEmail}`);
        return defaultEmail;
    }

    // Fix: Handle common placeholders that trigger 403 verification errors
    if (envEmail.includes('noreply.com') || envEmail.includes('example.com')) {
        console.warn(`⚠️ Unverified domain detected in '${envEmail}'. Falling back to ${defaultEmail}`);
        return defaultEmail;
    }

    return envEmail;
};

const FROM_EMAIL = getSafeSender();

let resend: Resend | null = null;

if (RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
    console.log(`✅ Email Service Initialized (Sender: ${FROM_EMAIL})`);
} else {
    console.warn("⚠️ RESEND_API_KEY is missing. Emails will be logged to console instead.");
}

const AuraEmailTemplate = ({
    username,
    title,
    body,
    buttonText,
    link,
    securityTip,
    footerText
}: {
    username: string;
    title: string;
    body: string;
    buttonText: string;
    link: string;
    securityTip: string;
    footerText: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; width: 100% !important; background-color: #f8fafc; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #334155; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding: 40px 0; }
        .main-table { margin: 0 auto; max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
        
        /* Header styling with Aura Gradient Strip */
        .header { 
            background: linear-gradient(90deg, #22d3ee, #c084fc, #f472b6); 
            height: 6px; 
            width: 100%;
            font-size: 0;
            line-height: 0;
        }
        
        /* Content styling */
        .content { padding: 48px 48px 32px 48px; }
        .greeting { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px; letter-spacing: -0.025em; }
        .text { font-size: 16px; line-height: 1.6; color: #475569; margin: 0 0 32px; }
        
        /* Button styling - Flat Blue */
        .button-wrapper { text-align: left; margin: 32px 0; }
        .button { 
            background-color: #2563eb; 
            color: #ffffff !important; 
            padding: 14px 32px; 
            border-radius: 8px; 
            text-decoration: none; 
            font-weight: 600; 
            font-size: 15px; 
            display: inline-block; 
            box-shadow: none;
        }
        .button:hover { background-color: #1d4ed8; }
        
        /* Security Box - Reassurance */
        .security-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-top: 40px; }
        .security-title { font-size: 12px; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .security-text { font-size: 13px; color: #64748b; line-height: 1.5; margin: 0; }

        /* Link Fallback */
        .link-fallback { font-size: 13px; color: #94a3b8; margin-top: 24px; word-break: break-all; }
        .link-fallback a { color: #2563eb; text-decoration: none; }

        /* Footer */
        .footer { background-color: #f8fafc; padding: 32px 48px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0 0 12px; }
        .footer-links a { color: #64748b; text-decoration: none; margin: 0 8px; font-size: 12px; font-weight: 500; }
        .signature { font-size: 15px; font-weight: 500; color: #0f172a; margin-top: 32px; padding-top: 0; }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="main-table" align="center" border="0" cellpadding="0" cellspacing="0">
            <!-- Header Strip -->
            <tr>
                <td class="header">&nbsp;</td>
            </tr>
            
            <!-- Content -->
            <tr>
                <td class="content">
                    <h1 class="greeting">Hi ${username},</h1>
                    <p class="text">${body}</p>
                    
                    <div class="button-wrapper">
                        <a href="${link}" class="button">${buttonText}</a>
                    </div>

                    <div class="signature">
                        Best regards,<br>
                        The Aura Team
                    </div>

                    <div class="link-fallback">
                        <p style="margin: 0; margin-bottom: 4px;">Link not working? Copy and paste this URL:</p>
                        <a href="${link}">${link}</a>
                    </div>

                    <div class="security-box">
                        <div class="security-title">🛡️ Security Check</div>
                        <p class="security-text">${securityTip}</p>
                    </div>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td class="footer">
                    <p class="footer-text">${footerText}</p>
                    <p class="footer-text">
                        © ${new Date().getFullYear()} Aura Gaming Inc.
                    </p>
                    <div class="footer-links">
                        <a href="#">Privacy</a> • 
                        <a href="#">Support</a> • 
                        <a href="#">Terms</a>
                    </div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
`;

/**
 * Logs email details to the console.
 * Crucial for debugging when emails are not delivered (e.g. Resend free tier limits).
 */
const logEmailDebug = (type: string, email: string, link: string) => {
    console.log("\n========================================================");
    console.log(`📧 [EMAIL DEBUG] ${type}`);
    console.log(`To: ${email}`);
    console.log(`From: ${FROM_EMAIL}`);
    console.log(`Action Link: ${link}`);
    console.log("========================================================\n");
};

export const sendVerificationEmail = async (email: string, username: string, verifyLink: string) => {
    // ALWAYS log the link in server logs. This allows admins to verify users manually 
    // if the email service fails or is not configured (common in dev/free tier).
    logEmailDebug("Sending Verification Email", email, verifyLink);

    if (!resend) {
        console.log("⚠️ Resend API Key missing. Simulating successful email send.");
        return { id: 'mock-id' };
    }

    try {
        const result = await resend.emails.send({
            from: `Aura Security <${FROM_EMAIL}>`,
            to: [email],
            subject: 'Verify your Aura Account 🔐',
            html: AuraEmailTemplate({
                username,
                title: 'Verify Your Account',
                body: `Welcome to <strong>Aura Tic-Tac-Toe</strong>! You're just one step away from unlocking competitive rankings, the global chat, and cloud saves.<br><br>Please verify your email address to get started.`,
                buttonText: 'Verify Email',
                link: verifyLink,
                securityTip: 'We will <strong>never</strong> ask for your password via email. Always ensure you are on the official Aura domain before entering your credentials.',
                footerText: "You received this email because you created an account on Aura Tic-Tac-Toe. If this wasn't you, you can safely ignore this email."
            }),
        });
        
        if (result.error) {
            console.error('❌ Resend API Error:', result.error);
            return null;
        }

        console.log(`📨 Verification email sent to ${email} (ID: ${result.data?.id})`);
        return result.data;
    } catch (e) {
        console.error('❌ Error sending verification email:', e);
        return null;
    }
};

export const sendPasswordResetEmail = async (email: string, username: string, resetLink: string) => {
    // ALWAYS log the link in server logs.
    logEmailDebug("Sending Password Reset Email", email, resetLink);

    if (!resend) {
        console.log("⚠️ Resend API Key missing. Simulating successful email send.");
        return { id: 'mock-id' };
    }

    try {
        const result = await resend.emails.send({
            from: `Aura Security <${FROM_EMAIL}>`,
            to: [email],
            subject: 'Reset your Password 🔑',
            html: AuraEmailTemplate({
                username,
                title: 'Password Reset Request',
                body: 'We received a request to reset your Aura account password. If this was you, you can securely set a new password by clicking the button below.<br><br>This link expires in <strong>1 hour</strong>.',
                buttonText: 'Reset Password',
                link: resetLink,
                securityTip: 'If you did not request a password reset, your account is safe. No action is required, but you may want to update your password if you suspect unauthorized access.',
                footerText: "You received this email because a password reset was requested for your account."
            }),
        });

        if (result.error) {
            console.error('❌ Resend API Error:', result.error);
            return null;
        }

        console.log(`📨 Password reset email sent to ${email} (ID: ${result.data?.id})`);
        return result.data;
    } catch (e) {
        console.error('❌ Error sending password reset email:', e);
        return null;
    }
};
