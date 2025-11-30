import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   PollsAPI - Real-time Polling with NexaDB        ║
  ║   Built with NestJS                               ║
  ║                                                   ║
  ╠═══════════════════════════════════════════════════╣
  ║                                                   ║
  ║   Server: http://localhost:${port}                   ║
  ║   NexaDB: localhost:6970                          ║
  ║                                                   ║
  ║   Endpoints:                                      ║
  ║   GET  /polls          - List all polls           ║
  ║   GET  /polls/:id      - Get poll with results    ║
  ║   POST /polls          - Create new poll          ║
  ║   POST /polls/:id/vote - Vote on a poll           ║
  ║   POST /polls/:id/close - Close a poll            ║
  ║   DELETE /polls/:id    - Delete a poll            ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
}
bootstrap();
