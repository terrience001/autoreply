import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import type { ChatMode, AiProvider, Room, Message } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, nickname, mode, aiProvider } = body as {
    userId: string;
    nickname: string;
    mode: ChatMode;
    aiProvider?: AiProvider;
  };
  if (!userId || !nickname || !mode) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  store.touch(userId);
  store.cleanupStale();

  const existing = store.getUserRoom(userId);
  if (existing) {
    const room = store.getRoom(existing);
    if (room && !room.closed) {
      return NextResponse.json({ status: 'matched', roomId: existing });
    }
    store.removeUserRoom(userId);
  }

  if (mode === 'ai') {
    const roomId = newId();
    const greeting: Message = {
      id: newId(),
      roomId,
      userId: 'ai',
      nickname: 'AI',
      text: '嘿〜很高興遇到你 ✨ 想聊些什麼呢？',
      createdAt: Date.now(),
    };
    const room: Room = {
      id: roomId,
      type: 'ai',
      aiProvider: aiProvider ?? 'claude',
      participants: [userId],
      messages: [greeting],
      createdAt: Date.now(),
    };
    store.setRoom(room);
    store.setUserRoom(userId, roomId);
    return NextResponse.json({ status: 'matched', roomId });
  }

  const partner = store.popOldestPartner(userId);
  if (partner) {
    const roomId = newId();
    const room: Room = {
      id: roomId,
      type: 'human',
      participants: [partner.userId, userId],
      messages: [
        {
          id: newId(),
          roomId,
          userId: 'system',
          nickname: 'system',
          text: `配對成功，與 ${partner.nickname} 開始聊天吧 👋`,
          createdAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
    };
    store.setRoom(room);
    store.setUserRoom(partner.userId, roomId);
    store.setUserRoom(userId, roomId);
    return NextResponse.json({ status: 'matched', roomId });
  }

  store.pushQueue({ userId, nickname, joinedAt: Date.now() });
  return NextResponse.json({ status: 'waiting' });
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 });
  store.touch(userId);
  const roomId = store.getUserRoom(userId);
  if (roomId) {
    const room = store.getRoom(roomId);
    if (room && !room.closed) {
      return NextResponse.json({ status: 'matched', roomId });
    }
  }
  return NextResponse.json({ status: 'waiting' });
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 });
  store.removeFromQueue(userId);
  return NextResponse.json({ ok: true });
}
