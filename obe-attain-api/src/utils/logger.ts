import winston from 'winston'
import { env } from '@/config/env'
import type { StreamOptions } from 'morgan'

const { combine, timestamp, colorize, printf, json, errors } = winston.format

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
    return `${ts as string} [${level}] ${message as string}${metaStr}`
  })
)

const prodFormat = combine(timestamp(), errors({ stack: true }), json())

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports:
    env.NODE_ENV === 'production'
      ? [
          new winston.transports.Console(),
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
          }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : [new winston.transports.Console()],
})

export const morganStream: StreamOptions = {
  write: (message: string) => {
    logger.info(message.trim())
  },
}

export default logger
