export interface Document {
  id: string;
  filename: string;
  chunks_count: number;
  created_at: string;
}

export interface Source {
  document: string;
  chunk_index: number;
  score: number | null;
  preview: string;
}

export interface AskResponse {
  answer: string;
  sources: Source[];
  tokens_used: number;
}

export interface Stats {
  total_documents: number;
  total_chunks: number;
  total_tokens: number;
  avg_chunks_per_doc: number;
}

export async function uploadDocument(file: File): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload document');
  }

  const data = await response.json();
  return data.document;
}

export async function fetchDocuments(): Promise<Document[]> {
  const response = await fetch('/documents');
  if (!response.ok) throw new Error('Failed to fetch documents');

  const data = await response.json();
  return data.documents || [];
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`/documents/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete document');
  }
}

export async function askQuestion(question: string, topK: number = 5): Promise<AskResponse> {
  const response = await fetch('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, top_k: topK }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get answer');
  }

  return response.json();
}

export async function fetchStats(): Promise<Stats> {
  const response = await fetch('/stats');
  if (!response.ok) throw new Error('Failed to fetch stats');

  const data = await response.json();
  return data.stats;
}
