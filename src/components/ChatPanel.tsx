'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Copy, RefreshCw, Trash2, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  createConversation, getConversations, updateConversation,
  deleteConversation, Message, getSettings
} from '@/lib/storage';
import { sendChatMessage } from '@/lib/ai';
import { parseCommand, executeBuiltinCommand } from '@/lib/commands';

export default function ChatPanel() {
  const { orbState, setOrbState, speak, settings, startTimer, addNotification, currentView } = useApp();
  const [conversations, setConversations] = useState(getConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const messages = activeConv?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (currentView === 'chat' && conversations.length === 0) {
      const conv = createConversation();
      setConversations(getConversations());
      setActiveConvId(conv.id);
    }
  }, [currentView]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    let convId = activeConvId;
    if (!convId) {
      const conv = createConversation(text.slice(0, 40));
      convId = conv.id;
      setActiveConvId(convId);
      setConversations(getConversations());
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    // Add user message
    const convs = getConversations();
    const conv = convs.find(c => c.id === convId);
    if (conv) {
      conv.messages.push(userMsg);
      conv.title = conv.messages.length === 1 ? text.slice(0, 40) : conv.title;
      updateConversation(convId, { messages: conv.messages, title: conv.title });
      setConversations([...convs]);
    }

    // Parse command
    const parsed = parseCommand(text);

    if (parsed.type === 'builtin') {
      setOrbState('THINKING');
      const response = await executeBuiltinCommand(parsed, speak, startTimer, undefined, undefined, undefined);
      setOrbState('IDLE');

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      const c2 = getConversations().find(c => c.id === convId);
      if (c2) {
        c2.messages.push(aiMsg);
        updateConversation(convId, { messages: c2.messages });
        setConversations([...getConversations()]);
      }

      if (settings.autoSpeak) speak(response);
      return;
    }

    // AI fallback
    setOrbState('THINKING');
    setLoading(true);

    const convMessages = conv?.messages || [];
    const result = await sendChatMessage(text, convMessages);
    setLoading(false);
    setOrbState('IDLE');

    const aiMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.response || result.error || 'No response received.',
      timestamp: new Date().toISOString(),
    };

    const c3 = getConversations().find(c => c.id === convId);
    if (c3) {
      c3.messages.push(aiMsg);
      updateConversation(convId, { messages: c3.messages });
      setConversations([...getConversations()]);
    }

    if (settings.autoSpeak) speak(result.response || result.error || '');
  }, [input, loading, activeConvId, settings, speak, setOrbState, startTimer]);

  const newConversation = () => {
    const conv = createConversation();
    setConversations(getConversations());
    setActiveConvId(conv.id);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification('JARVIS', 'Copied to clipboard', 'memory');
  };

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      {showSidebar && (
        <div className="w-64 border-r border-cyan-500/20 bg-black/30 flex flex-col shrink-0 hidden md:flex">
          <div className="p-3 border-b border-cyan-500/20">
            <button
              onClick={newConversation}
              className="w-full px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors"
            >
              + New Conversation
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveConvId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                  c.id === activeConvId
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-black/20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-cyan-400/60 hover:text-cyan-400 text-xs hidden md:block"
            >
              {showSidebar ? '◀ Hide' : '▶ Show'}
            </button>
            <h2 className="text-sm font-semibold text-cyan-400 tracking-wider">
              {activeConv?.title || 'JARVIS ASSISTANT'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={newConversation}
              className="px-3 py-1 text-xs text-gray-400 hover:text-cyan-400 border border-gray-700 rounded-lg hover:border-cyan-500/30 transition-colors"
            >
              New Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-4">⬡</div>
              <h3 className="text-lg text-cyan-400 font-semibold mb-2">JARVIS Ready</h3>
              <p className="text-gray-500 text-sm max-w-md">
                Type a message or use voice commands. Try &quot;Hey JARVIS, what time is it?&quot;
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm">
                {['What can you do?', 'Tell me a joke', 'Search the web', 'What time is it?'].map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="px-3 py-2 text-xs text-gray-400 border border-gray-700 rounded-lg hover:border-cyan-500/30 hover:text-cyan-400 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/15 border border-cyan-500/30 text-gray-200'
                      : 'bg-white/5 border border-white/10 text-gray-300'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="text-sm prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-lg !text-xs"
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-black/30 px-1.5 py-0.5 rounded text-cyan-300 text-xs" {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm">{msg.content}</div>
                  )}

                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleCopy(msg.content)}
                        className="text-gray-500 hover:text-cyan-400 transition-colors"
                        title="Copy"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => speak(msg.content)}
                        className="text-gray-500 hover:text-cyan-400 transition-colors"
                        title="Read aloud"
                      >
                        <Volume2 size={12} />
                      </button>
                      <span className="text-xs text-gray-600 ml-auto">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-cyan-400/60 text-sm"
            >
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs tracking-wider">PROCESSING REQUEST...</span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-cyan-500/20 bg-black/20">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask JARVIS anything..."
              className="flex-1 bg-white/5 border border-cyan-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-4 py-3 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-600 text-center">
            Press Enter to send · Ctrl+K for command palette
          </div>
        </div>
      </div>
    </div>
  );
}
