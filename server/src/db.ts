
// @ts-ignore: Suppress error if Prisma Client is not generated yet
import { PrismaClient } from '@prisma/client';

// Use a global variable to prevent multiple instances in development (hot-reloading)
const globalForPrisma = globalThis as unknown as { prisma: any };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Runtime safety check
// This explicitly checks if the 'user' model is attached to the client.
// If not, it means the client was generated before the schema had the User model,
// or it hasn't been generated at all.
if (!(prisma as any).user) {
    console.error("\n\x1b[41m\x1b[37m CRITICAL PRISMA ERROR \x1b[0m");
    console.error("\x1b[31mThe Prisma Client is missing the 'User' model.\x1b[0m");
    console.error("This happens when the schema is updated but the client is not regenerated.");
    console.error("\nPlease run the following command in your server terminal:\n");
    console.error("\x1b[36m    npx prisma generate\x1b[0m\n");
    console.error("Then restart the server.\n");
}
