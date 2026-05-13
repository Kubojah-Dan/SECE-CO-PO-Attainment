import IORedis from "ioredis";
import { logger } from "../lib/logger";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on("error", (err) => {
      logger.warn({ err }, "Redis connection error (queue features unavailable)");
    });
  }
  return connection;
}

export function isRedisAvailable(): boolean {
  try {
    return connection?.status === "ready";
  } catch {
    return false;
  }
}
