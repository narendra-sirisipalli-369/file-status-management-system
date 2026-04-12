import type { Metadata } from 'next';
import './globals.css';
import AppChrome from '@/components/AppChrome';

export const metadata: Metadata = {
  title: 'File Status Management System — INS Dega',
  description: 'Logistics Department File Status Management System, INS Dega, Eastern Naval Command, Indian Navy.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
