
import 'dotenv/config'; // Ensure env vars are loaded before other imports
import express from 'express';
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import path from 'path';
import apiRoutes from './api';
import http from 'http';
import { Server } from 'socket.io';
import { initializeSocketServer } from './sockets';
import { ClientToServerEvents, ServerToClientEvents } from './types';
import { startCleanupJob } from './cron';
import { logger } from './logger';
import { requestLogger } from './middleware';

logger.info("Starting Aura Server Initialization...");

// Check Env Vars on Startup
if (!process.env.RESEND_API_KEY) {
    logger.warn("⚠️ RESEND_API_KEY is not set. Email features will simulate success and log to console.");
} else {
    logger.info("✅ RESEND_API_KEY detected.");
}

if (!process.env.JWT_SECRET) {
    logger.error("❌ JWT_SECRET is not set. Auth will fail.");
}

const app = express();
const server = http.createServer(app);

// Allow localhost for dev and the production frontend URLs
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://aura-tic-tac-toe-frontend.onrender.com",
  "https://aura-tic-tac-toe-froentend.onrender.com",
  process.env.FRONTEND_URL
].filter((origin): origin is string => !!origin);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
} as any);

// Ensure PORT is an integer and defaults correctly
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}) as any);

app.use(express.json() as any);

// Apply Request Logger Middleware
app.use(requestLogger as any);

// Health Check
app.get('/health', (req, res) => {
    (res as any).status(200).json({ status: 'ok', uptime: (process as any).uptime() });
});

app.get('/', (req, res) => {
    (res as any).status(200).send('Aura Tic-Tac-Toe API is running.');
});

// API routes
app.use('/api', apiRoutes);

// Initialize Socket.IO server
try {
    initializeSocketServer(io);
    logger.info("Socket.IO initialized.");
} catch (e) {
    logger.error("Failed to initialize sockets:", e);
}

// Start Background Jobs
startCleanupJob();

// Basic error handler
const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error("Express Error:", { error: err.message, stack: err.stack });
  (res as any).status(500).json({ message: 'Something went wrong on the server.' });
};
app.use(errorHandler as any);

// Explicitly bind to 0.0.0.0 for Render/Docker compatibility
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server is running on http://0.0.0.0:${PORT}`);
});

server.on('error', (err: any) => {
    logger.error('Server failed to start (onError):', err);
    (process as any).exit(1);
});

// Global Error Handlers to prevent silent exits
(process as any).on('unhandledRejection', (reason: any, promise: any) => {
    logger.error('Unhandled Rejection', { promise, reason });
});

(process as any).on('uncaughtException', (error: any) => {
    logger.error('Uncaught Exception', { error });
    // Don't exit immediately to allow logs to flush if possible, or restart via orchestrator
});
