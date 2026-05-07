'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'human' | 'ai';
type AiProvider = 'claude' | 'openai';

function getOrCreateUserId() {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('chat_user_id');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('chat_user_id', id);
  }
  return id;
}

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState<Mode>('human');
  const [aiProvider, setAiProvider] = useState<AiProvider>('claude');
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    setUserId(getOrCreateUserId());
    const saved = localStorage.getItem('chat_nickname');
    if (saved) setNickname(saved);
  }, []);

  useEffect(() => {
    if (!waiting || !userId) return;
    const tick = async () => {
      try {
        const res = await fetch(`/api/match?userId=${userId}`).then(r => r.json());
        if (res.status === 'matched') {
          router.push(`/chat?room=${res.roomId}`);
        }
      } catch {}
    };
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, [waiting, userId, router]);

  const start = async () => {
    setError('');
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('請輸入暱稱');
      return;
    }
    localStorage.setItem('chat_nickname', trimmed);
    setWaiting(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, nickname: trimmed, mode, aiProvider }),
      }).then(r => r.json());
      if (res.status === 'matched') {
        router.push(`/chat?room=${res.roomId}`);
      } else if (res.status !== 'waiting') {
        setWaiting(false);
        setError(res.error || '發生錯誤');
      }
    } catch (e) {
      setWaiting(false);
      setError('網路錯誤');
    }
  };

  const cancel = async () => {
    if (!userId) return;
    await fetch(`/api/match?userId=${userId}`, { method: 'DELETE' });
    setWaiting(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-indigo-50 to-pink-50">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-center mb-2">隨機聊聊 ✨</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">輸入暱稱、選擇模式，開始聊天</p>

        {!waiting ? (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">暱稱</label>
            <input
              className="w-full rounded-xl border border-gray-300 px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="輸入你的暱稱"
              maxLength={20}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">聊天模式</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${mode === 'human' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setMode('human')}
              >
                👥 真人聊天
              </button>
              <button
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${mode === 'ai' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setMode('ai')}
              >
                🤖 AI 聊天
              </button>
            </div>

            {mode === 'ai' && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI 模型</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${aiProvider === 'claude' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-700 border-gray-300'}`}
                    onClick={() => setAiProvider('claude')}
                  >
                    Claude
                  </button>
                  <button
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${aiProvider === 'openai' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-700 border-gray-300'}`}
                    onClick={() => setAiProvider('openai')}
                  >
                    OpenAI
                  </button>
                </div>
              </>
            )}

            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <button
              onClick={start}
              className="w-full rounded-xl bg-indigo-600 text-white font-semibold py-3 hover:bg-indigo-700 transition"
            >
              開始聊天
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="inline-block animate-spin h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full mb-4" />
            <p className="text-gray-700 mb-2">正在尋找聊天對象…</p>
            <p className="text-gray-400 text-sm mb-6">配對成功會自動進入聊天室</p>
            <button onClick={cancel} className="text-sm text-gray-500 hover:text-gray-700 underline">取消</button>
          </div>
        )}
      </div>
    </main>
  );
}
