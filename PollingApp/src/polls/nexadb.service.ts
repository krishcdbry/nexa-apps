import { Injectable, OnModuleInit } from '@nestjs/common';
import NexaClient from 'nexaclient';

@Injectable()
export class NexaDBService implements OnModuleInit {
  private client: NexaClient;

  readonly DATABASE = 'polls_db';
  readonly POLLS_COLLECTION = 'polls';
  readonly VOTES_COLLECTION = 'votes';

  async onModuleInit() {
    this.client = new NexaClient({
      host: process.env.NEXADB_HOST || 'localhost',
      port: parseInt(process.env.NEXADB_PORT) || 6970,
      username: process.env.NEXADB_USER || 'root',
      password: process.env.NEXADB_PASS || 'nexadb123',
    });
    await this.client.connect();
    console.log('Connected to NexaDB');
  }

  getClient(): NexaClient {
    return this.client;
  }

  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}
