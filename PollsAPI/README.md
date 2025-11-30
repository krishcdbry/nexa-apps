# PollsAPI

Real-time polling API built with **NestJS** + **NexaDB**.

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![NexaDB](https://img.shields.io/badge/NexaDB-8b5cf6?style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

## Features

- Create polls with multiple options (2-10)
- Vote on polls (one vote per voter ID)
- Real-time vote counts and percentages
- Close polls to stop voting
- Delete polls and associated votes

## Quick Start

### 1. Start NexaDB

```bash
nexadb start
```

### 2. Install Dependencies

```bash
cd PollsAPI
npm install
```

### 3. Start the API

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

Server runs on: http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/polls` | List all polls with vote counts |
| GET | `/polls/:id` | Get single poll with full results |
| POST | `/polls` | Create a new poll |
| POST | `/polls/:id/vote` | Vote on a poll |
| POST | `/polls/:id/close` | Close a poll (no more voting) |
| DELETE | `/polls/:id` | Delete a poll and its votes |

## Usage Examples

### Create a Poll

```bash
curl -X POST http://localhost:3000/polls \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is your favorite programming language?",
    "options": ["JavaScript", "Python", "Rust", "Go"]
  }'
```

Response:
```json
{
  "success": true,
  "message": "Poll created successfully",
  "poll": {
    "id": "m4x7k9abc123",
    "question": "What is your favorite programming language?",
    "options": ["JavaScript", "Python", "Rust", "Go"],
    "status": "active",
    "total_votes": 0,
    "vote_counts": {
      "JavaScript": 0,
      "Python": 0,
      "Rust": 0,
      "Go": 0
    }
  }
}
```

### Vote on a Poll

```bash
curl -X POST http://localhost:3000/polls/m4x7k9abc123/vote \
  -H "Content-Type: application/json" \
  -d '{
    "voter_id": "user123",
    "option": "Rust"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Vote recorded successfully",
  "vote": {
    "poll_id": "m4x7k9abc123",
    "voter_id": "user123",
    "option": "Rust"
  },
  "results": {
    "total_votes": 1,
    "vote_counts": {
      "JavaScript": 0,
      "Python": 0,
      "Rust": 1,
      "Go": 0
    }
  }
}
```

### Get Poll Results

```bash
curl http://localhost:3000/polls/m4x7k9abc123
```

Response:
```json
{
  "success": true,
  "poll": {
    "id": "m4x7k9abc123",
    "question": "What is your favorite programming language?",
    "options": ["JavaScript", "Python", "Rust", "Go"],
    "status": "active",
    "total_votes": 10,
    "vote_counts": {
      "JavaScript": 3,
      "Python": 4,
      "Rust": 2,
      "Go": 1
    },
    "vote_percentages": {
      "JavaScript": 30,
      "Python": 40,
      "Rust": 20,
      "Go": 10
    }
  }
}
```

### List All Polls

```bash
curl http://localhost:3000/polls
```

### Close a Poll

```bash
curl -X POST http://localhost:3000/polls/m4x7k9abc123/close
```

### Delete a Poll

```bash
curl -X DELETE http://localhost:3000/polls/m4x7k9abc123
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | API server port |
| `NEXADB_HOST` | localhost | NexaDB host |
| `NEXADB_PORT` | 6970 | NexaDB port |
| `NEXADB_USER` | root | NexaDB username |
| `NEXADB_PASS` | nexadb123 | NexaDB password |

## Project Structure

```
PollsAPI/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   └── polls/
│       ├── polls.module.ts      # Polls module
│       ├── polls.controller.ts  # API routes
│       ├── polls.service.ts     # Business logic
│       ├── nexadb.service.ts    # NexaDB client wrapper
│       └── dto/
│           └── create-poll.dto.ts  # Data transfer objects
├── package.json
├── tsconfig.json
└── README.md
```

## Tech Stack

- **Framework**: NestJS 10
- **Database**: NexaDB (Binary Protocol - 10x faster)
- **Language**: TypeScript
- **Client**: nexaclient (NexaDB JavaScript client)

## License

MIT
