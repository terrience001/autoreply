export type ChatMode = 'human' | 'ai';
export type AiProvider = 'claude' | 'openai';

export type Message = {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  text: string;
  createdAt: number;
};

export type Room = {
  id: string;
  type: ChatMode;
  aiProvider?: AiProvider;
  participants: string[];
  messages: Message[];
  closed?: boolean;
  closedReason?: string;
  createdAt: number;
};

export type QueueEntry = {
  userId: string;
  nickname: string;
  joinedAt: number;
};
