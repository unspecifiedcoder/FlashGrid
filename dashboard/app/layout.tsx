// layout.tsx
// Root layout for the FlashGrid Next.js dashboard.
// Sets up global metadata, loads the Inter font from Google Fonts for
// systems that lack SF Pro, and applies the light surface background.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlashGrid | Parallel Batch Auction Engine on Monad",
  description:
    "State-sharded order matching engine that settles hundreds of orders per block across isolated price ticks on Monad.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Inter for the sans-serif stack; JetBrains Mono for monospace elements */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface-secondary font-sans antialiased text-content-primary">
        {children}
      </body>
    </html>
  );
}
