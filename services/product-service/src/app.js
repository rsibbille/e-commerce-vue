import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { connectDB } from './config/database.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import { runtimeConfig } from './config/runtime.js';

const app = express();

if (!runtimeConfig.isTest) {
  console.log(`App starting with APP_ENV=${runtimeConfig.appEnv}`);
}

// Connexion à la base de données
if (!runtimeConfig.isTest) {
  connectDB();
}

// Middleware
app.use(cors({
  origin: runtimeConfig.corsOrigin === '*' ? true : runtimeConfig.corsOrigin.split(',').map(origin => origin.trim()),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'userId', 'X-Request-Id'],
}));
app.use(express.json());

app.use((req, res, next) => {
  const requestId = req.get('X-Request-Id') || crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  if (!runtimeConfig.isTest) {
    console.log(`[${runtimeConfig.serviceName}] ${requestId} ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const mongodb = states[mongoose.connection.readyState] || 'unknown';
  const healthy = runtimeConfig.isTest || mongoose.connection.readyState === 1;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'OK' : 'DEGRADED',
    service: runtimeConfig.serviceName,
    environment: runtimeConfig.appEnv,
    mongodb,
    uptime: Math.round(process.uptime()),
  });
});

if (!runtimeConfig.isTest) {
  const server = app.listen(runtimeConfig.port, () => {
    console.log(`Product service running on port ${runtimeConfig.port} (${runtimeConfig.appEnv})`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down product-service`);
    await mongoose.disconnect();
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
