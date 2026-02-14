import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

// Import configurations
import { config } from './config/config';
import { logger } from './config/logger';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth.routes';
import bookingRoutes from './routes/booking.routes';
import providerRoutes from './routes/provider.routes';
import userRoutes from './routes/user.routes';
import healthRoutes from './routes/health.routes';

// Load environment variables
dotenv.config();

class Server {
  private app: Application;
  private httpServer;
  private io: SocketServer;
  private port: number;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
    });
    this.port = config.port;

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeWebSocket();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(requestLogger);

    // Rate limiting
    this.app.use(rateLimiter);

    logger.info('✅ Middleware initialized');
  }

  private initializeRoutes(): void {
    const apiPrefix = `/api/${config.apiVersion}`;

    // Health check (no prefix)
    this.app.use('/health', healthRoutes);

    // API routes
    this.app.use(`${apiPrefix}/auth`, authRoutes);
    this.app.use(`${apiPrefix}/bookings`, bookingRoutes);
    this.app.use(`${apiPrefix}/providers`, providerRoutes);
    this.app.use(`${apiPrefix}/users`, userRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
      });
    });

    logger.info('✅ Routes initialized');
  }

  private initializeWebSocket(): void {
    this.io.on('connection', (socket) => {
      logger.info(`🔌 WebSocket client connected: ${socket.id}`);

      // Join user-specific room
      socket.on('join', (userId: string) => {
        socket.join(`user:${userId}`);
        logger.info(`User ${userId} joined their room`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`🔌 WebSocket client disconnected: ${socket.id}`);
      });
    });

    // Make io accessible to routes
    this.app.set('io', this.io);

    logger.info('✅ WebSocket initialized');
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
    logger.info('✅ Error handling initialized');
  }

  public start(): void {
    this.httpServer.listen(this.port, () => {
      logger.info('');
      logger.info('🚀 ========================================');
      logger.info(`🚀 MOVZZ Backend Server Started`);
      logger.info(`🚀 Environment: ${config.env}`);
      logger.info(`🚀 Port: ${this.port}`);
      logger.info(`🚀 API: http://localhost:${this.port}/api/${config.apiVersion}`);
      logger.info(`🚀 Health: http://localhost:${this.port}/health`);
      logger.info('🚀 ========================================');
      logger.info('');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  private shutdown(): void {
    logger.info('🛑 Shutting down gracefully...');
    
    this.httpServer.close(() => {
      logger.info('✅ HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }
}

// Start server
const server = new Server();
server.start();

export default server;
