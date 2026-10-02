import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppChrome from '@/components/AppChrome';

export const metadata: Metadata = {
  title: 'File Status Management System — INS Dega',
  description: 'Logistics Department File Status Management System, INS Dega, Eastern Naval Command, Indian Navy.',
};

// Required for the fluid clamp()-based text/logo scaling in globals.css to
// take effect on tablets/phones — without it, mobile browsers render at a
// fake fixed-width "desktop" viewport and ignore vw-based sizing.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
