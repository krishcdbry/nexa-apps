import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { NexaDBService } from './nexadb.service';
import { CreatePollDto, VoteDto } from './dto/create-poll.dto';

@Injectable()
export class PollsService {
  constructor(private readonly nexadb: NexaDBService) {}

  async findAll() {
    const client = this.nexadb.getClient();

    try {
      await client.connect();

      const polls = await client.query(this.nexadb.POLLS_COLLECTION, {}, {
        database: this.nexadb.DATABASE,
        sort: { created_at: -1 },
      });

      const pollsWithCounts = await Promise.all(
        polls.map(async (poll) => {
          const votes = await client.query(this.nexadb.VOTES_COLLECTION, { poll_id: poll.id }, {
            database: this.nexadb.DATABASE,
          });

          const voteCounts = {};
          poll.options.forEach((opt) => (voteCounts[opt] = 0));
          votes.forEach((vote) => {
            if (voteCounts[vote.option] !== undefined) {
              voteCounts[vote.option]++;
            }
          });

          return {
            ...poll,
            total_votes: votes.length,
            vote_counts: voteCounts,
          };
        }),
      );

      return { success: true, count: pollsWithCounts.length, polls: pollsWithCounts };
    } finally {
      client.close();
    }
  }

  async findOne(id: string) {
    const client = this.nexadb.getClient();

    try {
      await client.connect();

      const polls = await client.query(this.nexadb.POLLS_COLLECTION, { id }, {
        database: this.nexadb.DATABASE,
      });

      if (polls.length === 0) {
        throw new NotFoundException('Poll not found');
      }

      const poll = polls[0];

      const votes = await client.query(this.nexadb.VOTES_COLLECTION, { poll_id: id }, {
        database: this.nexadb.DATABASE,
      });

      const voteCounts = {};
      const votePercentages = {};
      poll.options.forEach((opt) => (voteCounts[opt] = 0));

      votes.forEach((vote) => {
        if (voteCounts[vote.option] !== undefined) {
          voteCounts[vote.option]++;
        }
      });

      const totalVotes = votes.length;
      poll.options.forEach((opt) => {
        votePercentages[opt] = totalVotes > 0 ? Math.round((voteCounts[opt] / totalVotes) * 100) : 0;
      });

      return {
        success: true,
        poll: {
          ...poll,
          total_votes: totalVotes,
          vote_counts: voteCounts,
          vote_percentages: votePercentages,
        },
      };
    } finally {
      client.close();
    }
  }

  async create(createPollDto: CreatePollDto) {
    const { question, options, expires_at } = createPollDto;

    if (!question || typeof question !== 'string') {
      throw new BadRequestException('Question is required');
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      throw new BadRequestException('At least 2 options are required');
    }

    if (options.length > 10) {
      throw new BadRequestException('Maximum 10 options allowed');
    }

    const client = this.nexadb.getClient();

    try {
      await client.connect();

      const poll = {
        id: this.nexadb.generateId(),
        question: question.trim(),
        options: options.map((o) => o.trim()),
        created_at: new Date().toISOString(),
        expires_at: expires_at || null,
        status: 'active',
      };

      await client.insert(this.nexadb.POLLS_COLLECTION, poll, { database: this.nexadb.DATABASE });

      return {
        success: true,
        message: 'Poll created successfully',
        poll: {
          ...poll,
          total_votes: 0,
          vote_counts: Object.fromEntries(poll.options.map((o) => [o, 0])),
        },
      };
    } finally {
      client.close();
    }
  }

  async vote(id: string, voteDto: VoteDto) {
    const { voter_id, option } = voteDto;

    if (!voter_id || typeof voter_id !== 'string') {
      throw new BadRequestException('voter_id is required');
    }

    if (!option || typeof option !== 'string') {
      throw new BadRequestException('option is required');
    }

    const client = this.nexadb.getClient();

    try {
      await client.connect();

      const polls = await client.query(this.nexadb.POLLS_COLLECTION, { id }, {
        database: this.nexadb.DATABASE,
      });

      if (polls.length === 0) {
        throw new NotFoundException('Poll not found');
      }

      const poll = polls[0];

      if (poll.status !== 'active') {
        throw new BadRequestException('Poll is closed');
      }

      if (!poll.options.includes(option)) {
        throw new BadRequestException(`Invalid option. Valid options: ${poll.options.join(', ')}`);
      }

      const existingVotes = await client.query(this.nexadb.VOTES_COLLECTION, {
        poll_id: id,
        voter_id: voter_id,
      }, { database: this.nexadb.DATABASE });

      if (existingVotes.length > 0) {
        throw new BadRequestException(`Already voted: ${existingVotes[0].option}`);
      }

      const vote = {
        id: this.nexadb.generateId(),
        poll_id: id,
        voter_id: voter_id,
        option: option,
        voted_at: new Date().toISOString(),
      };

      await client.insert(this.nexadb.VOTES_COLLECTION, vote, { database: this.nexadb.DATABASE });

      const allVotes = await client.query(this.nexadb.VOTES_COLLECTION, { poll_id: id }, {
        database: this.nexadb.DATABASE,
      });

      const voteCounts = {};
      poll.options.forEach((opt) => (voteCounts[opt] = 0));
      allVotes.forEach((v) => {
        if (voteCounts[v.option] !== undefined) {
          voteCounts[v.option]++;
        }
      });

      return {
        success: true,
        message: 'Vote recorded successfully',
        vote: { poll_id: id, voter_id, option },
        results: { total_votes: allVotes.length, vote_counts: voteCounts },
      };
    } finally {
      client.close();
    }
  }

  async close(id: string) {
    const client = this.nexadb.getClient();

    try {
      await client.connect();

      const polls = await client.query(this.nexadb.POLLS_COLLECTION, { id }, {
        database: this.nexadb.DATABASE,
      });

      if (polls.length === 0) {
        throw new NotFoundException('Poll not found');
      }

      const poll = polls[0];

      await client.update(this.nexadb.POLLS_COLLECTION, poll._id, {
        status: 'closed',
        closed_at: new Date().toISOString(),
      }, { database: this.nexadb.DATABASE });

      return { success: true, message: 'Poll closed successfully', poll_id: id };
    } finally {
      client.close();
    }
  }

  async remove(id: string) {
    const client = this.nexadb.getClient();

    try {
      await client.connect();

      const polls = await client.query(this.nexadb.POLLS_COLLECTION, { id }, {
        database: this.nexadb.DATABASE,
      });

      if (polls.length === 0) {
        throw new NotFoundException('Poll not found');
      }

      const votes = await client.query(this.nexadb.VOTES_COLLECTION, { poll_id: id }, {
        database: this.nexadb.DATABASE,
      });

      for (const vote of votes) {
        await client.delete(this.nexadb.VOTES_COLLECTION, vote._id, { database: this.nexadb.DATABASE });
      }

      await client.delete(this.nexadb.POLLS_COLLECTION, polls[0]._id, { database: this.nexadb.DATABASE });

      return {
        success: true,
        message: 'Poll deleted successfully',
        deleted: { poll_id: id, votes_removed: votes.length },
      };
    } finally {
      client.close();
    }
  }
}
