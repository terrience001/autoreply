'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Message } from '@/lib/types';

function ChatInner() {
  const router = useRouter();
  const params = useSearchParams();
  const roomId = params.get('room') || '';
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [closed, setClosed] = useState(false);
  const [closedReason, setClosedReason] = useState('');
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [type, setType] = useState<'human' | 'ai'>('human');
  const [sending, setSending] = useState(false);
  const sinceRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = localStorage.getItem('chat_user_id');
    const nn = localStorage.getItem('chat_nickname');
    if (!id || !nn || !roomId) {
      router.replace('/');
      return;
    }
    setUserId(id);
    setNickname(nn);
  }, [roomId, router]);

  useEffect(() => {
    if (!userId || !roomId) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/messages?roomId=${roomId}&userId=${userId}&since=${sinceRef.current}`
        ).then(r => r.json());
        if (!alive) return;
        if (res.error) return;
        if (res.type) setType(res.type);
        if (res.messages?.length) {
          setMessages(prev => [...prev, ...res.messages]);
          sinceRef.current = Math.max(
            sinceRef.current,
            ...res.messages.map((m: Message) => m.createdAt)
          );
        }
        if (res.closed) {
          setClosed(true);
          setClosedReason(res.closedReason || '聊天室已關閉');
        }
      } catch {}
    };
    tick();
    const id = setInterval(tick, 1200);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [userId, roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending || closed) return;
    setSending(true);
    setText('');
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomId, userId, nickname, text: t }),
      });
    } finally {
      setSending(false);
    }
  };

  const leave = async () => {
    await fetch('/api/leave', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roomId, userId, nickname }),
    });
    router.replace('/');
  };

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-pink-50">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold">{type === 'ai' ? '🤖 AI 聊天' : '👥 真人聊天'}</h1>
          <p className="text-xs text-gray-500">你的暱稱：{nickname}</p>
        </div>
        <button
          onClick={leave}
          className="text-sm rounded-lg bg-red-50 text-red-600 px-3 py-1.5 hover:bg-red-100"
        >
          離開
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map(m => {
          if (m.userId === 'system') {
            return (
              <div key={m.id} className="text-center text-xs text-gray-500 py-2">
                {m.text}
              </div>
            );
          }
          const mine = m.userId === userId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                {!mine && <div className="text-xs text-gray-500 mb-0.5 px-1">{m.nickname}</div>}
                <div
                  className={`rounded-2xl px-4 py-2 break-words whitespace-pre-wrap ${mine ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 shadow-sm'}`}
                >
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
        {type === 'ai' && sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2 bg-white text-gray-500 shadow-sm text-sm">
              AI 正在輸入…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="bg-white border-t px-4 py-3">
        {closed ? (
          <div className="text-center text-sm text-gray-500 py-2">
            {closedReason}
            <button
              onClick={() => router.replace('/')}
              className="ml-3 text-indigo-600 underline"
            >
              回首頁
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="輸入訊息…"
              value={text}
              maxLength={2000}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={sending}
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="rounded-xl bg-indigo-600 text-white font-semibold px-5 hover:bg-indigo-700 disabled:bg-gray-300 transition"
            >
              送出
            </button>
          </div>
        )}
      </footer>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatInner />
    </Suspense>
  );
}
