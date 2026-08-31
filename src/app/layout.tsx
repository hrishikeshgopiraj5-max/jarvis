import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JARVIS AI Assistant',
  description: 'Just A Rather Very Intelligent System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
