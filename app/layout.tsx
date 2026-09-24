import type { Metadata } from 'next';
import Script from 'next/script';
import { extensionAttributeGuard } from '@/lib/extension-attribute-guard';
import './globals.css';
import './theme-toggle.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './careerpilot.css';
import './palette.css';
import './resumes.css';
import './cv-document.css';

export const metadata: Metadata = {
  title: 'CareerPilot AI',
  description: 'AI-powered career intelligence for better resumes, stronger applications, and faster career growth.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script
          id="extension-attribute-guard"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: extensionAttributeGuard }}
        />
        {children}
      </body>
    </html>
  );
}
