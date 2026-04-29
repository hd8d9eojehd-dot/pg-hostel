import winston from 'winston'

const { combine, timestamp, colorize, printf, json } = winston.format

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
  return `${ts} [${level}]: ${message}${metaStr}`
})

// Always use console-only transport (works on Vercel serverless)
export const logger = winston.createLogger({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        devFormat
      ),
    }),
  ],
})
