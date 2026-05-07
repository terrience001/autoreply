import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '隨機聊聊',
  description: '配對陳生人或 AI 即時聊天',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
