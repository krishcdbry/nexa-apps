export class CreatePollDto {
  question: string;
  options: string[];
  expires_at?: string;
}

export class VoteDto {
  voter_id: string;
  option: string;
}
