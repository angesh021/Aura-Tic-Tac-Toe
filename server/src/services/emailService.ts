
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'aura-security@noreply.com';

let resend: Resend | null = null;

if (RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
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
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: 'Poppins', Helvetica, Arial, sans-serif; color: #334155; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f1f5f9; padding: 40px 0; }
        .main-table { margin: 0 auto; max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        
        /* Header styling with Aura Gradient */
        .header { background-color: #0f172a; padding: 40px; text-align: center; background-image: radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%); position: relative; }
        .logo { font-size: 36px; font-weight: 800; letter-spacing: -1px; text-decoration: none; display: inline-block; }
        /* Gradient Text Fallback for Email Clients */
        .logo-text { 
            background: linear-gradient(90deg, #22d3ee, #c084fc, #f472b6); 
            -webkit-background-clip: text; 
            -webkit-text-fill-color: transparent; 
            color: #22d3ee; 
            text-shadow: 0 0 30px rgba(34,211,238,0.3);
        }
        
        /* Content styling */
        .content { padding: 40px 40px 30px 40px; }
        .greeting { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px; letter-spacing: -0.5px; }
        .text { font-size: 16px; line-height: 1.6; color: #475569; margin: 0 0 24px; }
        
        /* Button styling - Aura Theme */
        .button-wrapper { text-align: center; margin: 32px 0; }
        .button { 
            background: linear-gradient(90deg, #06b6d4, #3b82f6); 
            color: #ffffff !important; 
            padding: 16px 48px; 
            border-radius: 16px; 
            text-decoration: none; 
            font-weight: 700; 
            font-size: 16px; 
            display: inline-block; 
            box-shadow: 0 10px 20px -5px rgba(6, 182, 212, 0.4); 
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        
        /* Security Box - Reassurance */
        .security-box { background-color: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 12px; margin-top: 32px; }
        .security-title { font-size: 13px; font-weight: 700; color: #0369a1; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
        .security-text { font-size: 13px; color: #334155; line-height: 1.5; margin: 0; }

        /* Link Fallback */
        .link-fallback { font-size: 13px; color: #94a3b8; text-align: center; margin-top: 24px; word-break: break-all; }
        .link-fallback a { color: #0ea5e9; text-decoration: underline; }

        /* Footer */
        .footer { background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0 0 10px; }
        .footer-links a { color: #64748b; text-decoration: none; margin: 0 8px; font-size: 12px; font-weight: 600; }
        .signature { font-size: 16px; font-weight: 600; color: #0f172a; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        .highlight { color: #6366f1; }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="main-table" align="center" border="0" cellpadding="0" cellspacing="0">
            <!-- Header -->
            <tr>
                <td class="header">
                    <div class="logo">
                        <span class="logo-text">✨ AURA</span>
                    </div>
                </td>
            </tr>
            
            <!-- Content -->
            <tr>
                <td class="content">
                    <h1 class="greeting">Hi ${username}! 👋</h1>
                    <p class="text">${body}</p>
                    
                    <div class="button-wrapper">
                        <a href="${link}" class="button">${buttonText}</a>
                    </div>

                    <div class="link-fallback">
                        Link not working? Copy and paste this URL:<br>
                        <a href="${link}">${link}</a>
                    </div>

                    <div class="security-box">
                        <div class="security-title">🛡️ Security Check</div>
                        <p class="security-text">${securityTip}</p>
                    </div>

                    <div class="signature">
                        See you in the arena,<br>
                        <span class="highlight">The Aura Team</span>
                    </div>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td class="footer">
                    <p class="footer-text">${footerText}</p>
                    <p class="footer-text">
                        © ${new Date().getFullYear()} Aura Gaming Inc. • 123 Digital Blvd, Tech City
                    </p>
                    <div class="footer-links">
                        <a href="#">Privacy Policy</a> • 
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

export const sendVerificationEmail = async (email: string, username: string, verifyLink: string) => {
    // ---------------------------------------------------------
    // DEVELOPMENT HELPER: Log link to console
    // ---------------------------------------------------------
    console.log("\n========================================================");
    console.log(`📧 [EMAIL DEBUG] Sending Verification Email`);
    console.log(`To: ${email}`);
    console.log(`Link: ${verifyLink}`);
    console.log("========================================================\n");

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
        console.log(`📨 Verification email sent to ${email} (ID: ${result.data?.id})`);
        return result.data;
    } catch (e) {
        console.error('❌ Error sending verification email:', e);
        return null;
    }
};

export const sendPasswordResetEmail = async (email: string, username: string, resetLink: string) => {
    // ---------------------------------------------------------
    // DEVELOPMENT HELPER: Log link to console
    // ---------------------------------------------------------
    console.log("\n========================================================");
    console.log(`📧 [EMAIL DEBUG] Sending Password Reset Email`);
    console.log(`To: ${email}`);
    console.log(`Link: ${resetLink}`);
    console.log("========================================================\n");

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
        console.log(`📨 Password reset email sent to ${email} (ID: ${result.data?.id})`);
        return result.data;
    } catch (e) {
        console.error('❌ Error sending password reset email:', e);
        return null;
    }
};
