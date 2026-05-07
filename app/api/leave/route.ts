import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { roomId, userId, nickname } = body as {
    roomId: string;
    userId: string;
    nickname: string;
  };
  if (!roomId || !userId) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  const room = store.getRoom(roomId);
  if (room) {
    room.closed = true;
    room.closedReason = `${nickname || '對方'} 已離開聊天室`;
    room.messages.push({
      id: Math.random().toString(36).slice(2),
      roomId,
      userId: 'system',
      nickname: 'system',
      text: room.closedReason,
      createdAt: Date.now(),
    });
  }
  store.removeUserRoom(userId);
  store.removeFromQueue(userId);
  return NextResponse.json({ ok: true });
}
