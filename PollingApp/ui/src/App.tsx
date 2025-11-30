import { useState, useEffect, useMemo } from 'react'
import { fetchPolls, createPoll, votePoll, deletePoll, fetchCategories, type Poll, type Category, DEFAULT_CATEGORIES } from './api/polls'

// Category icons mapping
const categoryIcons: Record<string, string> = {
  'General': 'M4 6h16M4 12h16M4 18h16',
  'Technology': 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  'Sports': 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'Entertainment': 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z',
  'Politics': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  'Food & Drinks': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'Travel': 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'Health': 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  'Education': 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
  'Business': 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
}

function App() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [selectedCategory, setSelectedCategory] = useState('General')
  const [creating, setCreating] = useState(false)
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set())
  const [votingFor, setVotingFor] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    loadData()
    const saved = localStorage.getItem('votedPolls')
    if (saved) {
      setVotedPolls(new Set(JSON.parse(saved)))
    }
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [pollsData, categoriesData] = await Promise.all([
        fetchPolls(),
        fetchCategories(),
      ])
      setPolls(pollsData)
      setCategories(categoriesData.categories)
      setError(null)
    } catch (err) {
      setError('Failed to load data. Make sure the API is running.')
    } finally {
      setLoading(false)
    }
  }

  // Filter polls by category and search query
  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      const matchesCategory = !filterCategory || poll.category === filterCategory
      const matchesSearch = !searchQuery ||
        poll.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poll.options.some(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [polls, filterCategory, searchQuery])

  async function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return

    try {
      setCreating(true)
      await createPoll({
        question: question.trim(),
        options: options.filter(o => o.trim()),
        category: selectedCategory,
      })
      setQuestion('')
      setOptions(['', ''])
      setSelectedCategory('General')
      setShowCreateForm(false)
      loadData()
    } catch (err) {
      setError('Failed to create poll')
    } finally {
      setCreating(false)
    }
  }

  async function handleVote(pollId: string, option: string) {
    if (votedPolls.has(pollId)) return

    try {
      setVotingFor(`${pollId}-${option}`)
      await votePoll(pollId, option)
      const newVoted = new Set(votedPolls).add(pollId)
      setVotedPolls(newVoted)
      localStorage.setItem('votedPolls', JSON.stringify([...newVoted]))
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to vote')
    } finally {
      setVotingFor(null)
    }
  }

  async function handleDelete(pollId: string) {
    if (!confirm('Delete this poll?')) return

    try {
      await deletePoll(pollId)
      loadData()
    } catch (err) {
      setError('Failed to delete poll')
    }
  }

  function addOption() {
    if (options.length < 6) {
      setOptions([...options, ''])
    }
  }

  function removeOption(index: number) {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  function updateOption(index: number, value: string) {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  function getTotalVotes(votes: Record<string, number>) {
    return Object.values(votes).reduce((sum, v) => sum + v, 0)
  }

  function getVotePercentage(votes: Record<string, number>, option: string) {
    const total = getTotalVotes(votes)
    if (total === 0) return 0
    return Math.round((votes[option] / total) * 100)
  }

  const optionColors = [
    { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
    { bg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  ]

  const categoryColors: Record<string, string> = {
    'General': 'bg-slate-100 text-slate-600',
    'Technology': 'bg-blue-100 text-blue-600',
    'Sports': 'bg-green-100 text-green-600',
    'Entertainment': 'bg-purple-100 text-purple-600',
    'Politics': 'bg-red-100 text-red-600',
    'Food & Drinks': 'bg-orange-100 text-orange-600',
    'Travel': 'bg-cyan-100 text-cyan-600',
    'Health': 'bg-pink-100 text-pink-600',
    'Education': 'bg-indigo-100 text-indigo-600',
    'Business': 'bg-amber-100 text-amber-600',
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-white border-r border-slate-200 flex-shrink-0 transition-all duration-300 overflow-hidden fixed lg:relative h-screen z-30`}>
        <div className="w-72 h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">VoteBox</h1>
                <p className="text-xs text-slate-400">Powered by NexaDB</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search polls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <div className="mb-2 px-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Categories</span>
            </div>
            <nav className="space-y-1">
              {/* All Polls */}
              <button
                onClick={() => setFilterCategory(null)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  filterCategory === null
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="font-medium flex-1">All Polls</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${filterCategory === null ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {polls.length}
                </span>
              </button>

              {/* Category List */}
              {categories.filter(c => c.count > 0 || DEFAULT_CATEGORIES.includes(c.name)).map((category) => (
                <button
                  key={category.name}
                  onClick={() => setFilterCategory(category.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    filterCategory === category.name
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={categoryIcons[category.name] || categoryIcons['General']} />
                  </svg>
                  <span className="font-medium flex-1">{category.name}</span>
                  {category.count > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${filterCategory === category.name ? 'bg-white/20' : 'bg-slate-100'}`}>
                      {category.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Create Poll Button */}
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create New Poll
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {filterCategory || 'All Polls'}
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredPolls.length} poll{filteredPolls.length !== 1 ? 's' : ''}
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Poll
            </button>
          </div>
        </header>

        <div className="p-6 max-w-4xl mx-auto">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-slideDown">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-red-700 font-medium text-sm flex-1">{error}</span>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Create Poll Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowCreateForm(false)} />
              <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-modalIn max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Create Poll</h2>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleCreatePoll}>
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Question</label>
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="What do you want to ask?"
                      className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                    <div className="grid grid-cols-2 gap-2">
                      {DEFAULT_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            selectedCategory === cat
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Options</label>
                    <div className="space-y-2.5">
                      {options.map((option, index) => (
                        <div key={index} className="flex gap-2 group">
                          <div className="relative flex-1">
                            <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg ${optionColors[index % optionColors.length].bg} flex items-center justify-center`}>
                              <span className="text-white text-xs font-bold">{String.fromCharCode(65 + index)}</span>
                            </div>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateOption(index, e.target.value)}
                              placeholder={`Option ${index + 1}`}
                              className="w-full pl-14 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
                            />
                          </div>
                          {options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(index)}
                              className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {options.length < 6 && (
                      <button
                        type="button"
                        onClick={addOption}
                        className="mt-3 text-sm text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add option
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-5 py-3 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !question.trim() || options.filter(o => o.trim()).length < 2}
                      className="flex-1 px-5 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                    >
                      {creating ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Creating...
                        </>
                      ) : (
                        'Create Poll'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin" />
              </div>
              <p className="mt-6 text-slate-400 font-medium">Loading polls...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredPolls.length === 0 && (
            <div className="text-center py-20">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center">
                  <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {searchQuery ? 'No matching polls' : filterCategory ? `No polls in ${filterCategory}` : 'No polls yet'}
              </h3>
              <p className="text-slate-500 mb-8">
                {searchQuery ? 'Try a different search term' : 'Create your first poll to get started!'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Poll
                </button>
              )}
            </div>
          )}

          {/* Polls List */}
          {!loading && filteredPolls.length > 0 && (
            <div className="space-y-5">
              {filteredPolls.map((poll) => {
                const hasVoted = votedPolls.has(poll.id)
                const totalVotes = getTotalVotes(poll.votes)
                const maxVotes = Math.max(...Object.values(poll.votes), 0)

                return (
                  <div
                    key={poll.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300"
                  >
                    {/* Poll Header */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${categoryColors[poll.category] || categoryColors['General']}`}>
                            {poll.category}
                          </span>
                          {hasVoted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Voted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              Active
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">{poll.question}</h3>
                      </div>
                      <button
                        onClick={() => handleDelete(poll.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete poll"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Options */}
                    <div className="space-y-2.5">
                      {poll.options.map((option, optIndex) => {
                        const percentage = getVotePercentage(poll.votes, option)
                        const votes = poll.votes[option] || 0
                        const isWinning = hasVoted && votes === maxVotes && maxVotes > 0
                        const color = optionColors[optIndex % optionColors.length]
                        const isVoting = votingFor === `${poll.id}-${option}`

                        return (
                          <button
                            key={option}
                            onClick={() => handleVote(poll.id, option)}
                            disabled={hasVoted || votingFor !== null}
                            className={`w-full relative overflow-hidden rounded-xl border-2 transition-all duration-300 text-left ${
                              hasVoted
                                ? isWinning
                                  ? 'border-emerald-200 bg-emerald-50/50'
                                  : `${color.border} ${color.light}`
                                : `border-slate-100 hover:border-slate-200 hover:shadow-sm cursor-pointer active:scale-[0.99]`
                            }`}
                          >
                            {hasVoted && (
                              <div
                                className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${
                                  isWinning ? 'bg-emerald-100' : `${color.light}`
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            )}

                            <div className="relative px-4 py-3.5 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                                  hasVoted
                                    ? isWinning
                                      ? 'bg-emerald-500 text-white'
                                      : `${color.bg} text-white`
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {String.fromCharCode(65 + optIndex)}
                                </div>
                                <span className="font-medium text-slate-800">{option}</span>
                              </div>

                              <div className="flex items-center gap-3">
                                {isVoting && (
                                  <svg className="w-5 h-5 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                )}

                                {hasVoted && (
                                  <>
                                    <span className={`text-sm font-semibold ${isWinning ? 'text-emerald-600' : color.text}`}>
                                      {percentage}%
                                    </span>
                                    <span className="text-xs text-slate-400 tabular-nums">
                                      {votes}
                                    </span>
                                    {isWinning && (
                                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                                      </svg>
                                    )}
                                  </>
                                )}

                                {!hasVoted && !isVoting && (
                                  <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {!hasVoted && (
                      <p className="mt-4 text-center text-sm text-slate-400">
                        Click an option to vote
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Custom Styles */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-modalIn { animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  )
}

export default App
