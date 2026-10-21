import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './lib/db.js';

async function bootstrap() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
  } catch (error) {
    console.warn('⚠️ Could not connect to MongoDB initially. Will retry on request or verify Atlas network access.');
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 AajKyaBanaye API listening at http://localhost:${env.PORT}`);
    console.log(`📡 Health endpoint: http://localhost:${env.PORT}/health`);
  });

  const shutdown = () => {
    console.log('🛑 Gracefully shutting down server...');
    server.close(() => {
      console.log('Process terminated.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap();
