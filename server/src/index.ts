import express from 'express';
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import apiRoutes from './api';
import http from 'http';
import { Server } from 'socket.io';
import { initializeSocketServer } from './sockets';
import { ClientToServerEvents, ServerToClientEvents } from './types';
import { startCleanupJob } from './cron';

console.log("Starting Aura Server...");

// Load .env from the root directory
// When running from 'server' dir, root is one level up.
// When running from dist, it might vary, but for dev this is robust.
dotenv.config({ path: path.resolve((process as any).cwd(), '../.env') });

const app = express();
const server = http.createServer(app);

// Allow localhost for dev and the production frontend URL
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://aura-tic-tac-toe-frontend.onrender.com",
  process.env.FRONTEND_URL
].filter((origin): origin is string => !!origin);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log("Blocked CORS origin:", origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Ensure PORT is an integer and defaults correctly
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}) as any);

app.use(express.json() as any);

// Health Check
app.get('/health', (req, res) => {
    (res as any).status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
    (res as any).status(200).send('Aura Tic-Tac-Toe API is running.');
});

// API routes
app.use('/api', apiRoutes);

// Initialize Socket.IO server
initializeSocketServer(io);

// Start Background Jobs
startCleanupJob();

// Basic error handler
const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Express Error:", err.stack);
  (res as any).status(500).json({ message: 'Something went wrong on the server.' });
};
app.use(errorHandler as any);

// Explicitly bind to 0.0.0.0 for Render/Docker compatibility
try {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
      console.log(`Allowed CORS Origins:`, allowedOrigins);
    });
} catch (e) {
    console.error("Failed to start server:", e);
}

server.on('error', (err: any) => {
    console.error('Server failed to start (onError):', err);
});

// Global Error Handlers to prevent silent exits
(process as any).on('unhandledRejection', (reason: any, promise: any) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

(process as any).on('uncaughtException', (error: any) => {
    console.error('Uncaught Exception:', error);
});