export interface Poll {
  id: string;
  question: string;
  options: string[];
  category: string;
  votes: Record<string, number>;
  total_votes: number;
  created_at: string;
}

export interface Category {
  name: string;
  count: number;
}

export interface CreatePollData {
  question: string;
  options: string[];
  category?: string;
}

const API_BASE = '/polls';

// Transform API response to match our Poll interface
function transformPoll(apiPoll: any): Poll {
  return {
    id: apiPoll.id,
    question: apiPoll.question,
    options: apiPoll.options,
    category: apiPoll.category || 'General',
    votes: apiPoll.vote_counts || {},
    total_votes: apiPoll.total_votes || 0,
    created_at: apiPoll.created_at,
  };
}

export async function fetchPolls(): Promise<Poll[]> {
  const response = await fetch(API_BASE);
  if (!response.ok) throw new Error('Failed to fetch polls');
  const data = await response.json();
  return (data.polls || []).map(transformPoll);
}

export async function fetchCategories(): Promise<{ categories: Category[]; total_polls: number }> {
  const response = await fetch(`${API_BASE}/categories`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  const data = await response.json();
  return {
    categories: data.categories || [],
    total_polls: data.total_polls || 0,
  };
}

export async function fetchPoll(id: string): Promise<Poll> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) throw new Error('Failed to fetch poll');
  const data = await response.json();
  return transformPoll(data.poll);
}

export async function createPoll(data: CreatePollData): Promise<Poll> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create poll');
  const result = await response.json();
  return transformPoll(result.poll);
}

// Generate a simple voter ID for this browser session
function getVoterId(): string {
  let voterId = localStorage.getItem('voterId');
  if (!voterId) {
    voterId = 'voter_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('voterId', voterId);
  }
  return voterId;
}

export async function votePoll(id: string, option: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voter_id: getVoterId(), option }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Failed to vote');
  }
}

export async function deletePoll(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete poll');
}

// Default categories for the create poll form
export const DEFAULT_CATEGORIES = [
  'General',
  'Technology',
  'Sports',
  'Entertainment',
  'Politics',
  'Food & Drinks',
  'Travel',
  'Health',
  'Education',
  'Business',
];
