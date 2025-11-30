# PollingApp

Real-time polling application built with **NestJS** + **React** + **NexaDB**.

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![NexaDB](https://img.shields.io/badge/NexaDB-8b5cf6?style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

## Features

- Create polls with multiple options (2-6)
- Vote on polls with real-time results
- Beautiful React UI with Tailwind CSS
- Vote tracking with localStorage
- Delete polls

## Quick Start

### 1. Start NexaDB

```bash
nexadb start
```

### 2. Start the API

```bash
cd PollingApp
npm install
npm run start:dev
```

API runs on: http://localhost:3000

### 3. Start the UI

```bash
cd ui
npm install
npm run dev
```

UI runs on: http://localhost:5175

## Project Structure

```
PollingApp/
├── src/                        # NestJS API
│   ├── main.ts
│   ├── app.module.ts
│   └── polls/
│       ├── polls.module.ts
│       ├── polls.controller.ts
│       ├── polls.service.ts
│       ├── nexadb.service.ts
│       └── dto/
│           └── create-poll.dto.ts
├── ui/                         # React UI
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── api/
│   │       └── polls.ts
│   ├── package.json
│   └── vite.config.ts
├── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/polls` | List all polls |
| GET | `/polls/:id` | Get single poll |
| POST | `/polls` | Create a new poll |
| POST | `/polls/:id/vote` | Vote on a poll |
| DELETE | `/polls/:id` | Delete a poll |

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

### Vote on a Poll

```bash
curl -X POST http://localhost:3000/polls/{id}/vote \
  -H "Content-Type: application/json" \
  -d '{"option": "Rust"}'
```

## Tech Stack

- **API**: NestJS 10 + TypeScript
- **UI**: React 18 + Vite + Tailwind CSS
- **Database**: NexaDB (Binary Protocol)
- **Client**: nexaclient (NexaDB JavaScript SDK)

## License

MIT
