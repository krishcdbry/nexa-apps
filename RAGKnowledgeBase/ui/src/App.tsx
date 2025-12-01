import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Document,
  Source,
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  askQuestion,
  fetchStats,
  Stats,
} from './api/rag';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  tokens?: number;
}

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, [loadDocuments, loadStats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      try {
        await uploadDocument(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    }

    setIsUploading(false);
    setShowUpload(false);
    loadDocuments();
    loadStats();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;

    try {
      await deleteDocument(id);
      loadDocuments();
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleAsk = async () => {
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    setInput('');
    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await askQuestion(question);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        tokens: response.tokens_used,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-white">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 bg-[#12121a] border-r border-[#2a2a3a] flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#2a2a3a]">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🧠</div>
            <div>
              <h1 className="font-bold text-lg">RAG Knowledge Base</h1>
              <p className="text-xs text-gray-500">Powered by NexaDB</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="p-4 border-b border-[#2a2a3a]">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1a1a2a] rounded-lg p-3">
                <div className="text-2xl font-bold text-indigo-400">{stats.total_documents}</div>
                <div className="text-xs text-gray-500">Documents</div>
              </div>
              <div className="bg-[#1a1a2a] rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-400">{stats.total_chunks}</div>
                <div className="text-xs text-gray-500">Chunks</div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="p-4">
          <button
            onClick={() => setShowUpload(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2.5 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </button>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Documents</div>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📄</div>
              <p className="text-sm">No documents yet</p>
              <p className="text-xs mt-1">Upload a document to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-[#1a1a2a] rounded-lg p-3 hover:bg-[#22223a] transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{doc.filename}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {doc.chunks_count} chunks
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1 transition"
                      title="Delete document"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-[#2a2a3a] flex items-center px-4 gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-gray-400">Ask questions about your documents</div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-2xl font-bold mb-2">Ask anything about your documents</h2>
              <p className="text-gray-500 max-w-md">
                Upload documents and ask questions. I'll search through your knowledge base and provide answers with source citations.
              </p>
              <div className="mt-8 flex flex-wrap gap-2 justify-center">
                {['What is this about?', 'Summarize the main points', 'What are the key takeaways?'].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="px-4 py-2 bg-[#1a1a2a] hover:bg-[#22223a] rounded-full text-sm transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`animate-fade-in ${
                    msg.role === 'user' ? 'flex justify-end' : ''
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="bg-indigo-600 rounded-2xl rounded-br-sm px-4 py-3 max-w-lg">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="bg-[#1a1a2a] rounded-2xl rounded-bl-sm px-5 py-4">
                      <div className="markdown-content">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-[#2a2a3a]">
                          <button
                            onClick={() => setShowSources(showSources === msg.id ? null : msg.id)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {msg.sources.length} sources used
                            {msg.tokens && ` • ${msg.tokens} tokens`}
                          </button>
                          {showSources === msg.id && (
                            <div className="mt-3 space-y-2">
                              {msg.sources.map((src, i) => (
                                <div key={i} className="bg-[#0f0f1a] rounded-lg p-3 text-sm">
                                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                    <span className="bg-indigo-600/30 text-indigo-400 px-1.5 py-0.5 rounded">
                                      {src.document}
                                    </span>
                                    {src.score && (
                                      <span className="text-emerald-400">
                                        {(src.score * 100).toFixed(1)}% match
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-gray-300 text-xs">{src.preview}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="animate-fade-in">
                  <div className="bg-[#1a1a2a] rounded-2xl rounded-bl-sm px-5 py-4 inline-block">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 pb-2">
            <div className="max-w-3xl mx-auto bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-2 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="hover:text-red-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 border-t border-[#2a2a3a]">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAsk()}
                placeholder="Ask a question about your documents..."
                className="flex-1 bg-[#1a1a2a] border border-[#2a2a3a] rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition"
                disabled={isLoading || documents.length === 0}
              />
              <button
                onClick={handleAsk}
                disabled={isLoading || !input.trim() || documents.length === 0}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Ask
              </button>
            </div>
            {documents.length === 0 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Upload documents to start asking questions
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div
            className={`bg-[#12121a] rounded-2xl p-6 max-w-md w-full border-2 transition-colors ${
              isDragging ? 'border-indigo-500 drop-zone-active' : 'border-[#2a2a3a]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Upload Document</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div
              className="border-2 border-dashed border-[#3a3a4a] rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-400">Processing document...</p>
                  <p className="text-xs text-gray-500 mt-1">Creating embeddings</p>
                </div>
              ) : (
                <>
                  <div className="text-5xl mb-4">📄</div>
                  <p className="text-gray-300 mb-2">
                    Drag & drop files here or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports .pdf, .txt, .md, .markdown
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,.pdf"
              multiple
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
            />

            <div className="mt-4 text-xs text-gray-500">
              Documents will be chunked and indexed for semantic search
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
