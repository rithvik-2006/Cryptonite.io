import type { Metadata } from 'next';
import { Geist, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { SocketProvider } from '@/providers/socket-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Cryptonite | Institutional Terminal',
  description: 'Cryptonite Institutional Terminal Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${geist.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-[#090909] text-[#e5e2e1] font-geist overflow-x-hidden min-h-screen">
        <QueryProvider>
          <SocketProvider>
            <Sidebar />
            <TopBar />
            <main className="ml-[240px] pt-16 min-h-screen p-6 bg-background">
              {children}
            </main>
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
