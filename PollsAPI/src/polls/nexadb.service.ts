import { Injectable } from '@nestjs/common';
import { NexaClient } from 'nexaclient';

@Injectable()
export class NexaDBService {
  private config = {
    host: process.env.NEXADB_HOST || 'localhost',
    port: parseInt(process.env.NEXADB_PORT) || 6970,
    username: process.env.NEXADB_USER || 'root',
    password: process.env.NEXADB_PASS || 'nexadb123',
  };

  readonly DATABASE = 'polls_db';
  readonly POLLS_COLLECTION = 'polls';
  readonly VOTES_COLLECTION = 'votes';

  getClient(): NexaClient {
    return new NexaClient(this.config);
  }

  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}
