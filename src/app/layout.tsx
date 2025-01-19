import type { Metadata } from "next";
import "./globals.css";
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';

export const metadata: Metadata = {
  title: "NFL Stats Generator",
  description: "Compare NFL playoff team statistics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
