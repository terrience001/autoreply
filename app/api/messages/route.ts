import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { generateAiReply } from '@/lib/ai';
import type { Message } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId');
  const userId = req.nextUrl.searchParams.get('userId');
  const since = parseInt(req.nextUrl.searchParams.get('since') || '0', 10);
  if (!roomId || !userId) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  store.touch(userId);
  const room = store.getRoom(roomId);
  if (!room) return NextResponse.json({ error: 'room not found' }, { status: 404 });
  const messages = room.messages.filter(m => m.createdAt > since);
  return NextResponse.json({
    messages,
    closed: room.closed ?? false,
    closedReason: room.closedReason,
    type: room.type,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { roomId, userId, nickname, text } = body as {
    roomId: string;
    userId: string;
    nickname: string;
    text: string;
  };
  if (!roomId || !userId || !text?.trim()) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  store.touch(userId);
  const room = store.getRoom(roomId);
  if (!room) return NextResponse.json({ error: 'room not found' }, { status: 404 });
  if (room.closed) return NextResponse.json({ error: 'room closed' }, { status: 400 });
  if (!room.participants.includes(userId)) {
    return NextResponse.json({ error: 'not a participant' }, { status: 403 });
  }
  const msg: Message = {
    id: newId(),
    roomId,
    userId,
    nickname,
    text: text.trim().slice(0, 2000),
    createdAt: Date.now(),
  };
  room.messages.push(msg);

  if (room.type === 'ai' && room.aiProvider) {
    try {
      const reply = await generateAiReply(room.aiProvider, room.messages);
      room.messages.push({
        id: newId(),
        roomId,
        userId: 'ai',
        nickname: 'AI',
        text: reply,
        createdAt: Date.now() + 1,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      room.messages.push({
        id: newId(),
        roomId,
        userId: 'system',
        nickname: 'system',
        text: `(AI 回覆失敗：${errMsg})`,
        createdAt: Date.now() + 1,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
