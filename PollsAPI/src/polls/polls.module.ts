import { Module } from '@nestjs/common';
import { PollsController } from './polls.controller';
import { PollsService } from './polls.service';
import { NexaDBService } from './nexadb.service';

@Module({
  controllers: [PollsController],
  providers: [PollsService, NexaDBService],
})
export class PollsModule {}
