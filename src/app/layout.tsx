import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'Flow Media | AI Real Estate Deal Engine',
  description: 'Deterministic underwriting and AI-driven real estate orchestration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-[#020617] text-white antialiased`}>
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.05),transparent)] pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.05),transparent)] pointer-events-none" />
        {children}
      </body>
    </html>
  );
}

