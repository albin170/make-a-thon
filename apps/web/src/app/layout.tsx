import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brightloop — Subscription Management System',
  description: 'Enterprise Subscription Lifecycle, Invoicing & Billing Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
