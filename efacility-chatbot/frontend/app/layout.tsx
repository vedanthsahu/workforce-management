import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'eFACiLiTY Workspace',
  description: 'Workspace seat booking chatbot',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
