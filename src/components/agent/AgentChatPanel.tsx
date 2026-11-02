'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AgentMessage, InterviewQuestion, AgentConfig } from '@/lib/agent/types';

interface AgentChatPanelProps {
  messages: AgentMessage[];
  currentQuestion: InterviewQuestion | null;
  readyForScript: boolean;
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onSelectOption: (field: string, value: string) => void;
  onGenerateScript: () => void;
  className?: string;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  messages,
  currentQuestion,
  readyForScript,
  isLoading,
  onSendMessage,
  onSelectOption,
  onGenerateScript,
  className = '',
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentQuestion, isLoading]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-purple-50 bg-gradient-to-r from-purple-50/50 via-white to-pink-50/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-200 text-sm">
            🤖
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Tillercast AI Agent
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Conversational Video Director
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
          Pictory-Class Agent
        </span>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 text-xl shadow-inner">
              ✨
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              What video will you create today?
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Describe any topic, paste a script, or provide a URL. I will interview you and compose a viral video.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[82%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-br-none'
                    : 'bg-purple-50/60 text-slate-800 border border-purple-100 rounded-bl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Current Adaptive Interview Question Options */}
        {currentQuestion && !readyForScript && (
          <div className="bg-gradient-to-br from-purple-50/70 to-white border border-purple-100 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-100/60 px-2 py-0.5 rounded-full">
                Step {currentQuestion.step} of 5
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {currentQuestion.question}
              </span>
            </div>
            {currentQuestion.helperText && (
              <p className="text-[11px] text-slate-500">
                {currentQuestion.helperText}
              </p>
            )}

            <div className="grid grid-cols-1 gap-2 pt-1">
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSelectOption(currentQuestion.field, opt.value)}
                  className={`text-left px-3.5 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between ${
                    opt.isDecideForMe
                      ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 text-purple-800 hover:border-purple-400 font-semibold'
                      : 'bg-white border-slate-200/80 text-slate-800 hover:border-purple-300 hover:bg-purple-50/40'
                  }`}
                >
                  <div>
                    <div className="text-xs font-medium flex items-center gap-1.5">
                      <span>{opt.label}</span>
                      {opt.badge && (
                        <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.description && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {opt.description}
                      </div>
                    )}
                  </div>
                  <span className="text-slate-400 text-xs font-bold">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ready for Script CTA */}
        {readyForScript && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 text-white shadow-md shadow-purple-200 space-y-2">
            <h4 className="text-xs font-bold flex items-center gap-1.5">
              <span>✨</span> All Parameters Gathered!
            </h4>
            <p className="text-[11px] text-purple-100">
              Ready to generate your high-retention video script. Script generation is 100% free (0 credits consumed).
            </p>
            <button
              type="button"
              onClick={onGenerateScript}
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-white text-purple-700 hover:bg-purple-50 shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Composing Script...' : '⚡ Generate Scene-by-Scene Script'}
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-purple-600 text-xs px-2 py-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Agent is thinking & composing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t border-purple-50 bg-white"
      >
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200/90 rounded-2xl p-2 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply or refine... (e.g. 'Make hook punchier', 'Use British voice')"
            rows={2}
            className="flex-1 bg-transparent border-0 outline-none resize-none text-xs text-slate-800 placeholder:text-slate-400 px-2 py-1"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-xs shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
