"""
RAG Knowledge Base - A Retrieval-Augmented Generation system powered by NexaDB

This application allows users to:
1. Upload documents (text, markdown)
2. Ask questions and get AI-powered answers using retrieved context
3. View source citations for transparency

Uses NexaDB's vector search for fast semantic retrieval.
"""

import os
import io
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

import tiktoken
import openai
from nexaclient import NexaClient
from pypdf import PdfReader

# Load environment variables
load_dotenv()

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
NEXADB_HOST = os.getenv("NEXADB_HOST", "localhost")
NEXADB_PORT = int(os.getenv("NEXADB_PORT", "6970"))
NEXADB_USER = os.getenv("NEXADB_USER", "root")
NEXADB_PASSWORD = os.getenv("NEXADB_PASSWORD", "nexadb123")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

# Database and collection names
DATABASE = "rag_knowledge_base"
DOCUMENTS_COLLECTION = "documents"
CHUNKS_COLLECTION = "chunks"

# Chunking configuration
CHUNK_SIZE = 500  # tokens
CHUNK_OVERLAP = 50  # tokens

# Global client
openai_client: Optional[openai.OpenAI] = None


def get_client() -> NexaClient:
    """Create a fresh NexaDB client connection for each request."""
    return NexaClient(
        host=NEXADB_HOST,
        port=NEXADB_PORT,
        username=NEXADB_USER,
        password=NEXADB_PASSWORD
    )


def get_openai_client() -> openai.OpenAI:
    """Get or create OpenAI client."""
    global openai_client
    if openai_client is None:
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
        openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
    return openai_client


def generate_id() -> str:
    """Generate a unique ID."""
    return uuid.uuid4().hex[:16]


def count_tokens(text: str) -> int:
    """Count tokens in text using tiktoken."""
    try:
        encoding = tiktoken.encoding_for_model("gpt-4")
        return len(encoding.encode(text))
    except:
        # Fallback: rough estimate
        return len(text) // 4


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks based on token count."""
    try:
        encoding = tiktoken.encoding_for_model("gpt-4")
        tokens = encoding.encode(text)
    except:
        # Fallback to character-based chunking
        words = text.split()
        chunks = []
        current_chunk = []
        current_size = 0

        for word in words:
            word_size = len(word) // 4 + 1
            if current_size + word_size > chunk_size and current_chunk:
                chunks.append(" ".join(current_chunk))
                # Keep overlap
                overlap_words = current_chunk[-overlap//4:] if overlap > 0 else []
                current_chunk = overlap_words
                current_size = sum(len(w)//4 + 1 for w in current_chunk)
            current_chunk.append(word)
            current_size += word_size

        if current_chunk:
            chunks.append(" ".join(current_chunk))
        return chunks

    chunks = []
    start = 0

    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text = encoding.decode(chunk_tokens)
        chunks.append(chunk_text)
        start += chunk_size - overlap

    return chunks


def create_embedding(text: str) -> list[float]:
    """Create embedding for text using OpenAI."""
    client = get_openai_client()
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        dimensions=EMBEDDING_DIMENSIONS
    )
    return response.data[0].embedding


def setup_database():
    """Ensure database and collections exist."""
    db = get_client()

    # Create database if not exists
    try:
        db.create_database(DATABASE)
    except:
        pass

    # Create collections if not exist
    try:
        db.create_collection(DOCUMENTS_COLLECTION, database=DATABASE)
    except:
        pass

    try:
        db.create_collection(CHUNKS_COLLECTION, database=DATABASE)
    except:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Setup on startup."""
    setup_database()
    yield


# FastAPI app
app = FastAPI(
    title="RAG Knowledge Base",
    description="AI-powered document Q&A using NexaDB vector search",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class AskRequest(BaseModel):
    question: str
    top_k: int = 5


class AskResponse(BaseModel):
    answer: str
    sources: list[dict]
    tokens_used: int


class DocumentResponse(BaseModel):
    id: str
    filename: str
    chunks_count: int
    created_at: str


# Routes
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "RAG Knowledge Base"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document."""

    # Validate file type
    allowed_extensions = [".txt", ".md", ".markdown", ".pdf"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )

    # Read file content
    content = await file.read()

    # Extract text based on file type
    if file_ext == ".pdf":
        try:
            pdf_reader = PdfReader(io.BytesIO(content))
            text_parts = []
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            text = "\n\n".join(text_parts)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    else:
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="File must be UTF-8 encoded text")

    if not text.strip():
        raise HTTPException(status_code=400, detail="File is empty")

    db = get_client()
    doc_id = generate_id()

    # Chunk the document
    chunks = chunk_text(text)

    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    # Create document record
    doc = {
        "id": doc_id,
        "filename": file.filename,
        "chunks_count": len(chunks),
        "total_tokens": count_tokens(text),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db.create(DOCUMENTS_COLLECTION, doc, database=DATABASE)

    # Process chunks and create embeddings
    for i, chunk_text_content in enumerate(chunks):
        try:
            embedding = create_embedding(chunk_text_content)

            chunk = {
                "id": generate_id(),
                "document_id": doc_id,
                "document_name": file.filename,
                "chunk_index": i,
                "text": chunk_text_content,
                "vector": embedding,
                "tokens": count_tokens(chunk_text_content),
            }
            db.create(CHUNKS_COLLECTION, chunk, database=DATABASE)
        except Exception as e:
            # If embedding fails, clean up and raise error
            db.delete(DOCUMENTS_COLLECTION, doc["_id"] if "_id" in doc else doc_id, database=DATABASE)
            raise HTTPException(status_code=500, detail=f"Failed to create embedding: {str(e)}")

    return {
        "success": True,
        "message": f"Document uploaded and processed successfully",
        "document": {
            "id": doc_id,
            "filename": file.filename,
            "chunks_count": len(chunks),
        }
    }


@app.get("/documents")
async def list_documents():
    """List all uploaded documents."""
    db = get_client()

    docs = db.query(DOCUMENTS_COLLECTION, {}, limit=100, database=DATABASE)

    return {
        "success": True,
        "count": len(docs),
        "documents": [
            {
                "id": doc["id"],
                "filename": doc["filename"],
                "chunks_count": doc["chunks_count"],
                "created_at": doc["created_at"],
            }
            for doc in docs
        ]
    }


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and all its chunks."""
    db = get_client()

    # Find document
    docs = db.query(DOCUMENTS_COLLECTION, {"id": doc_id}, limit=1, database=DATABASE)
    if not docs:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = docs[0]

    # Delete all chunks for this document
    chunks = db.query(CHUNKS_COLLECTION, {"document_id": doc_id}, limit=1000, database=DATABASE)
    for chunk in chunks:
        try:
            db.delete(CHUNKS_COLLECTION, chunk["_id"], database=DATABASE)
        except:
            pass

    # Delete document
    db.delete(DOCUMENTS_COLLECTION, doc["_id"], database=DATABASE)

    return {
        "success": True,
        "message": "Document deleted successfully",
        "deleted": {
            "document_id": doc_id,
            "chunks_removed": len(chunks)
        }
    }


@app.post("/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    """Ask a question and get an AI-powered answer using RAG."""

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    db = get_client()

    # Create embedding for the question
    try:
        question_embedding = create_embedding(request.question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create question embedding: {str(e)}")

    # Vector search for relevant chunks
    try:
        results = db.vector_search(
            CHUNKS_COLLECTION,
            vector=question_embedding,
            top_k=request.top_k,
            database=DATABASE
        )
    except Exception as e:
        # Fallback: get all chunks and do manual similarity (less efficient)
        results = db.query(CHUNKS_COLLECTION, {}, limit=request.top_k, database=DATABASE)

    if not results:
        return AskResponse(
            answer="I don't have any documents to search through. Please upload some documents first.",
            sources=[],
            tokens_used=0
        )

    # Build context from retrieved chunks
    context_parts = []
    sources = []

    for i, result in enumerate(results):
        chunk = result if isinstance(result, dict) else result
        text = chunk.get("text", "")
        doc_name = chunk.get("document_name", "Unknown")
        chunk_idx = chunk.get("chunk_index", 0)
        score = chunk.get("_score", chunk.get("score", 0))

        context_parts.append(f"[Source {i+1}: {doc_name}]\n{text}")
        sources.append({
            "document": doc_name,
            "chunk_index": chunk_idx,
            "score": round(score, 4) if score else None,
            "preview": text[:200] + "..." if len(text) > 200 else text
        })

    context = "\n\n---\n\n".join(context_parts)

    # Build prompt
    system_prompt = """You are a helpful AI assistant that answers questions based on the provided context.

Rules:
1. Only answer based on the provided context
2. If the context doesn't contain enough information, say so
3. Cite your sources by mentioning which document the information came from
4. Be concise but thorough
5. If asked about something not in the context, politely explain you can only answer based on the uploaded documents"""

    user_prompt = f"""Context:
{context}

---

Question: {request.question}

Please provide a helpful answer based on the context above."""

    # Call LLM
    try:
        oai = get_openai_client()
        response = oai.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        answer = response.choices[0].message.content
        tokens_used = response.usage.total_tokens if response.usage else 0

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {str(e)}")

    return AskResponse(
        answer=answer,
        sources=sources,
        tokens_used=tokens_used
    )


@app.get("/stats")
async def get_stats():
    """Get knowledge base statistics."""
    db = get_client()

    docs = db.query(DOCUMENTS_COLLECTION, {}, limit=1000, database=DATABASE)
    chunks = db.query(CHUNKS_COLLECTION, {}, limit=10000, database=DATABASE)

    total_tokens = sum(doc.get("total_tokens", 0) for doc in docs)

    return {
        "success": True,
        "stats": {
            "total_documents": len(docs),
            "total_chunks": len(chunks),
            "total_tokens": total_tokens,
            "avg_chunks_per_doc": round(len(chunks) / len(docs), 1) if docs else 0
        }
    }


# Serve static files for UI (production)
if os.path.exists("ui/dist"):
    app.mount("/", StaticFiles(directory="ui/dist", html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
