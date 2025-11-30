import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { NexaDBService } from './nexadb.service';
import { CreatePollDto, VoteDto, DEFAULT_CATEGORIES } from './dto/create-poll.dto';

@Injectable()
export class PollsService {
  constructor(private readonly nexadb: NexaDBService) {}

  private get db() {
    return { database: this.nexadb.DATABASE };
  }

  async findAll() {
    const client = this.nexadb.getClient();

    const polls = await client.query(this.nexadb.POLLS_COLLECTION, {}, { limit: 100, ...this.db });

    const pollsWithCounts = await Promise.all(
      polls.map(async (poll: any) => {
        const votes = await client.query(this.nexadb.VOTES_COLLECTION, { poll_id: poll.id }, { limit: 1000, ...this.db });

        const voteCounts: Record<string, number> = {};
        poll.options.forEach((opt: string) => (voteCounts[opt] = 0));
        votes.forEach((vote: any) => {
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
  }

  async findOne(id: string) {
    const client = this.nexadb.getClient();

    const polls = await client.query(this.nexadb.POLLS_COLLECTION, { id }, { limit: 1, ...this.db });

    if (polls.length === 0) {
      throw new NotFoundException('Poll not found');
    }

    const poll = polls[0] as any;

    const votes = await client.query(this.nexadb.VOTES_COLLECTION, { poll_id: id }, { limit: 1000, ...this.db });

    const voteCounts: Record<string, number> = {};
    const votePercentages: Record<string, number> = {};
    poll.options.forEach((opt: string) => (voteCounts[opt] = 0));

    votes.forEach((vote: any) => {
      if (voteCounts[vote.option] !== undefined) {
        voteCounts[vote.option]++;
      }
    });

    const totalVotes = votes.length;
    poll.options.forEach((opt: string) => {
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
  }

  async create(createPollDto: CreatePollDto) {
    const { question, options, category, expires_at } = createPollDto;

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

    const poll = {
      id: this.nexadb.generateId(),
      question: question.trim(),
      options: options.map((o) => o.trim()),
      category: category?.trim() || 'General',
      created_at: new Date().toISOString(),
      expires_at: expires_at || null,
      status: 'active',
    };

    await client.create(this.nexadb.POLLS_COLLECTION, poll, this.db);

    return {
      success: true,
      message: 'Poll created successfully',
      poll: {
        ...poll,
        total_votes: 0,
        vote_counts: Object.fromEntries(poll.options.map((o) => [o, 0])),
      },
    };
  }

  async getCategories() {
    const client = this.nexadb.getClient();
    const polls = await client.query(this.nexadb.POLLS_COLLECTION, {}, { limit: 1000, ...this.db });

    // Get unique categories from polls and merge with defaults
    const pollCategories = new Set(polls.map((p: any) => p.category || 'General'));
    const allCategories = new Set([...DEFAULT_CATEGORIES, ...pollCategories]);

    // Count polls per category
    const categoryCounts: Record<string, number> = {};
    allCategories.forEach((cat) => (categoryCounts[cat] = 0));
    polls.forEach((p: any) => {
      const cat = p.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    return {
      success: true,
      categories: Array.from(allCategories).map((name) => ({
        name,
        count: categoryCounts[name],
      })),
      total_polls: polls.length,
    };
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

    const polls = await client.query(this.nexadb.POLLS_COLLECTION, { id }, { limit: 1, ...this.db });

    if (polls.length === 0) {
      throw new NotFoundException('Poll not found');
    }

    const poll = polls[0] as any;

    if (poll.status !== 'active') {
      throw new BadRequestException('Poll is closed');
    }

    if (!poll.options.includes(option)) {
      throw new BadRequestException(`Invalid option. Valid options: ${poll.options.join(', ')}`);
    }

    const existingVotes = await client.query(this.nexadb.VOTES_COLLECTION, {
      poll_id: id,
      voter_id: voter_id,
    }, { limit: 1, ...this.db });

    if (existingVotes.length > 0) {
      throw new BadRequestException(`Already voted: ${(existingVotes[0] as any).option}`);
    }

    const vote = {
      id: this.nexadb.generateId(),
      poll_id: id,
      voter_id: voter_id,
      option: option,
      voted_at: new Date().toISOString(),
    };

    await client.create(this.nexadb.VOTES_COLLECTION, vote, this.db);

    const allVotes = await client.query(this.nexadb.VOTES_COLLECTION, { poll_id: id }, { limit: 1000, ...this.db });

    const voteCounts: Record<string, number> = {};
    poll.options.forEach((opt: string) => (voteCounts[opt] = 0));
    allVotes.forEach((v: any) => {
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
  }

  async close(id: string) {
    const client = this.nexadb.getClient();

    const polls = await client.query(this.nexadb.POLLS_COLLECTION, { id }, { limit: 1, ...this.db });

    if (polls.length === 0) {
      throw new NotFoundException('Poll not found');
    }

    const poll = polls[0] as any;

    await client.update(this.nexadb.POLLS_COLLECTION, poll._id, {
      status: 'closed',
      closed_at: new Date().toISOString(),
    }, this.db);

    return { success: true, message: 'Poll closed successfully', poll_id: id };
  }

  async remove(id: string) {
    const client = this.nexadb.getClient();

    const polls = await client.query(this.nexadb.POLLS_COLLECTION, { id }, { limit: 1, ...this.db });

    if (polls.length === 0) {
      throw new NotFoundException('Poll not found');
    }

    const votes = await client.query(this.nexadb.VOTES_COLLECTION, { poll_id: id }, { limit: 1000, ...this.db });

    for (const vote of votes) {
      await client.delete(this.nexadb.VOTES_COLLECTION, (vote as any)._id, this.db);
    }

    await client.delete(this.nexadb.POLLS_COLLECTION, (polls[0] as any)._id, this.db);

    return {
      success: true,
      message: 'Poll deleted successfully',
      deleted: { poll_id: id, votes_removed: votes.length },
    };
  }
}
