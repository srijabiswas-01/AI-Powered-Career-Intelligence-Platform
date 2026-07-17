import type { Metadata } from 'next';
import './globals.css';
import './theme-toggle.css';

export const metadata: Metadata = {
  title: 'Clymbra AI',
  description: 'AI-powered career intelligence for better resumes, stronger applications, and faster career growth.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
