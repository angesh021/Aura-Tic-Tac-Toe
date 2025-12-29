import * as Sentry from "@sentry/react";

export const initMonitoring = () => {
    // VITE_SENTRY_DSN must be set in your .env or Render dashboard
    const meta = import.meta as any;
    const dsn = meta.env?.VITE_SENTRY_DSN;

    if (dsn) {
        Sentry.init({
            dsn,
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration({
                    maskAllText: false,
                    blockAllMedia: false,
                }),
            ],
            // Performance Monitoring
            tracesSampleRate: 1.0, // Capture 100% of the transactions (Adjust for high traffic)
            
            // Session Replay
            replaysSessionSampleRate: 0.1, // Sample rate for all sessions (10%)
            replaysOnErrorSampleRate: 1.0, // Sample rate when errors occur (100%)
        });
        console.log("✅ Sentry Monitoring Initialized");
    } else {
        console.log("ℹ️ Monitoring skipped: VITE_SENTRY_DSN not found.");
    }
};