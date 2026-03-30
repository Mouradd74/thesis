'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function LessonChat({ lessonContext, lessonTitle }: { lessonContext: string; lessonTitle: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    // Add placeholder for assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          lessonContext,
        }),
      })

      if (!res.ok) {
        throw new Error(`Chat API returned ${res.status}`)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response body')

      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk

        // Update the last message (assistant placeholder)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: accumulated }
          return updated
        })
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I had trouble generating a response. Please try again!',
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!lessonContext) return null

  return (
    <div className="relative">
      {/* Floating Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 px-4 py-2 rounded-full 
                     bg-gradient-to-r from-indigo-600/80 to-purple-600/80
                     hover:from-indigo-500 hover:to-purple-500
                     border border-indigo-500/30 hover:border-indigo-400/50
                     text-white text-sm font-medium
                     transition-all duration-300 
                     shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40
                     hover:scale-[1.03] active:scale-[0.98]"
          aria-label="Open lesson chatbot"
        >
          <div className="relative">
            <MessageCircle className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          </div>
          <span>Ask AI Tutor</span>
          <Sparkles className="h-3 w-3 text-indigo-200 group-hover:text-white transition-colors" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="animate-in slide-in-from-bottom-4 fade-in duration-300 
                      w-full rounded-2xl overflow-hidden
                      border border-indigo-500/20 bg-zinc-950/95 backdrop-blur-xl
                      shadow-2xl shadow-indigo-500/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 
                          bg-gradient-to-r from-indigo-600/20 to-purple-600/20 
                          border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                <Bot className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">AI Tutor</h4>
                <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                  Helping with: {lessonTitle}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="h-[340px] overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <Sparkles className="h-6 w-6 text-indigo-400" />
                </div>
                <p className="text-sm font-medium text-foreground">Ask me anything about this lesson!</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I&apos;ve read the study guide and I&apos;m ready to help you understand the material better.
                </p>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {['Summarize the key points', 'Explain the main concept', 'Give me an example'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion)
                        inputRef.current?.focus()
                      }}
                      className="px-3 py-1.5 text-xs rounded-full 
                                 bg-zinc-800/80 border border-zinc-700/50 
                                 text-muted-foreground hover:text-foreground 
                                 hover:border-indigo-500/30 hover:bg-indigo-500/10
                                 transition-all duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} 
                           animate-in slide-in-from-bottom-2 duration-200`}
              >
                {/* Avatar */}
                <div
                  className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-indigo-500/10 border-indigo-500/30'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-indigo-400" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-foreground rounded-tr-md'
                      : 'bg-zinc-800/60 border border-zinc-700/50 text-foreground rounded-tl-md'
                  }`}
                >
                  {msg.content || (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-4 py-3 border-t border-indigo-500/20 bg-zinc-900/50">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about this lesson..."
                disabled={isStreaming}
                className="flex-1 h-10 px-4 rounded-xl text-sm
                           bg-zinc-800/60 border border-zinc-700/50 
                           text-foreground placeholder:text-zinc-500
                           focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20
                           disabled:opacity-50 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="h-10 w-10 rounded-xl flex items-center justify-center
                           bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600
                           text-white transition-all duration-200
                           hover:shadow-lg hover:shadow-indigo-500/20
                           disabled:shadow-none disabled:cursor-not-allowed
                           active:scale-95"
                aria-label="Send message"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
