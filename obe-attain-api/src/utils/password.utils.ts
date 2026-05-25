import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { env } from '@/config/env'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS)
}

export async function comparePassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function generateTempPassword(): string {
  // 10 char random alphanumeric using crypto.randomBytes
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.randomBytes(10)
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('')
}
