import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { db } from './core/db';
import judge0Routes from './routes/judge0Routes';
import interviewRoutes from './routes/interviewRoutes';
import dsaRoutes from './routes/dsaRoutes';
import userRoutes from './routes/userRoutes';
import audioRoutes from './routes/audioRoutes'
import aiRoutes from './routes/aiRoutes';
import resumeRoutes from './routes/resumeRoutes';
import { clerkMiddleware } from "@clerk/express";

const app = express();
const PORT: number = 3000;

// Initialize the database connection
// Database connection will be initialized in startServer

// CORS configuration
app.use(cors({
  origin: [
    'https://metric-seven-orpin.vercel.app',
    'https://metric-agent.onrender.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 🔥 This attaches auth info if token exists
app.use(clerkMiddleware())

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', req.body);
  next();
});

app.use('/api/code', judge0Routes);
app.use('/api/interview', interviewRoutes);
app.use('/api/problem', dsaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/resume', resumeRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Metric API Server is running!',
    version: '1.0.0',
    endpoints: {
      code: '/api/code',
      interview: '/api/interview',
      problem: '/api/problem',
      users: '/api/users',
    }
  });
});

// 404 handler for debugging unmatched routes
app.use((req: Request, res: Response) => {
  console.warn(`No matching route for ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

const startServer = async () => {
  try {
    await db.execute('SELECT 1'); 
    
    app.listen(PORT, () => {
      console.log(`✅ Database verified and server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();