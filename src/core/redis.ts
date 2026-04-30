import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASS,
});

export const bufferMessage = async (interviewId: string, role: 'USER' | 'AI', content: string) => {
  const message = JSON.stringify({ role, content, createdAt: new Date() });
  await redis.rpush(`transcript:${interviewId}`, message);
};