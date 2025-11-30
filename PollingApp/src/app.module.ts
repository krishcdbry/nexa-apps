import { Module } from '@nestjs/common';
import { PollsModule } from './polls/polls.module';

@Module({
  imports: [PollsModule],
})
export class AppModule {}
