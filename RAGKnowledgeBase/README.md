# RAG Knowledge Base

A Retrieval-Augmented Generation (RAG) system powered by NexaDB for document Q&A.

## Features

- **Document Upload**: Upload text and markdown files
- **Semantic Chunking**: Automatic text chunking with overlap
- **Vector Search**: Fast HNSW-based semantic search via NexaDB
- **AI Answers**: GPT-powered responses with source citations
- **Modern UI**: Clean, responsive React interface

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React UI  │────▶│  FastAPI    │────▶│   NexaDB    │
│   (Vite)    │     │  Backend    │     │  (Vectors)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   OpenAI    │
                   │ (Embeddings │
                   │  + Chat)    │
                   └─────────────┘
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- NexaDB running (`nexadb start`)
- OpenAI API key

## Quick Start

### 1. Start NexaDB

```bash
nexadb start &
```

### 2. Setup Backend

```bash
# Install Python dependencies
pip3 install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start the API server
python3 main.py &
```

### 3. Setup Frontend

```bash
cd ui
npm install
npm run dev
```

### 4. Open the App

- **Web UI**: http://localhost:5176
- **API Docs**: http://localhost:8000/docs

## Configuration

Edit `.env` to configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `NEXADB_HOST` | NexaDB host | localhost |
| `NEXADB_PORT` | NexaDB port | 6970 |
| `EMBEDDING_MODEL` | OpenAI embedding model | text-embedding-3-small |
| `LLM_MODEL` | OpenAI chat model | gpt-4o-mini |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload` | Upload document |
| `GET` | `/documents` | List documents |
| `DELETE` | `/documents/{id}` | Delete document |
| `POST` | `/ask` | Ask question |
| `GET` | `/stats` | Get statistics |

## How It Works

1. **Upload**: Documents are chunked (~500 tokens with overlap)
2. **Embed**: Each chunk gets a vector embedding via OpenAI
3. **Store**: Chunks and vectors stored in NexaDB
4. **Query**: Questions are embedded and matched via vector search
5. **Generate**: Top-k chunks form context for GPT to generate answers

## Example Usage

```bash
# Upload a document
curl -X POST http://localhost:8000/upload \
  -F "file=@document.md"

# Ask a question
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is this document about?"}'
```

## Tech Stack

- **Backend**: Python, FastAPI, nexaclient
- **Frontend**: React, Vite, Tailwind CSS, TypeScript
- **Database**: NexaDB (vector search)
- **AI**: OpenAI (embeddings + chat)

## License

MIT
