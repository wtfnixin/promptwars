import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Domino Sky · Flight Disruption Cascade & Recovery Simulator',
  description:
    'Interactive airline network disruption cascade and AI recovery simulator with 100% deterministic delay propagation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
