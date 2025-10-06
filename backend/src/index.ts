import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { timing } from 'hono/timing';
import { serve } from '@hono/node-server';
import { serveStatic } from 'hono/serve-static';
import { config } from 'dotenv';
import { prisma } from './lib/prisma';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import cameraRoutes from './routes/camera';

// Load environment variables
config();

const app = new Hono();

// Middleware for all routes
app.use('*', cors());
app.use('*', logger());
app.use('*', timing());
app.use('*', prettyJSON());

// Custom error type
interface ApiError extends Error {
  status?: number;
}

// Error handling middleware
app.onError((err: ApiError, c) => {
  console.error(`❌ Error: ${err.message}`);
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  
  return c.json({ 
    error: message,
    status,
    path: c.req.path
  }, status as 400 | 401 | 403 | 404 | 500);
});

app.route('/auth', authRoutes);
app.use('/api/*', authMiddleware);
app.route('/api/cameras', cameraRoutes);
app.use('/snapshots/*', serveStatic({ root: './' } as any));


const port = process.env.PORT || 3000;

// Database connection test
async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database successfully');
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    process.exit(1);
  }
}


// Start server
async function startServer() {
  await checkDatabaseConnection();

  serve({
    fetch: app.fetch,
    port: Number(port),
  }, (info) => {
    console.log(`🚀 Server started on port ${info.port}`);
    console.log(`🔗 Local: http://localhost:${info.port}`);
  });
}


startServer().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});

// Export for testing
export default app;
