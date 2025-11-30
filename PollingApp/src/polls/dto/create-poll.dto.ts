export class CreatePollDto {
  question: string;
  options: string[];
  category?: string;
  expires_at?: string;
}

export class VoteDto {
  voter_id: string;
  option: string;
}

// Default categories
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
