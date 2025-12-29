
import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for local development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message} `;
  if (Object.keys(metadata).length > 0) {
    msg += JSON.stringify(metadata);
  }
  return msg;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json() // Default to JSON for production (easier for Datadog/CloudWatch)
  ),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' 
        ? json()
        : combine(colorize(), devFormat),
    }),
  ],
});
