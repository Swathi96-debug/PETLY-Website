import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import petRoutes from './routes/petRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import adoptionRoutes from './routes/adoptionRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import logger from './utils/cloudwatchLogger.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure database connection is ready for serverless invocations
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Server System Healthcheck Routes
app.get(['/', '/api', '/api/healthcheck'], (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'PETLY Backend Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/adoption', adoptionRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/assistant', assistantRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only start listener when running directly as a standalone process (not when imported as a Vercel serverless function)
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (!process.env.VERCEL && isDirectRun) {
  app.listen(PORT, () => {
    logger.info(`[PETLY Backend Server] Listening on port ${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
  });
}

export default app;
