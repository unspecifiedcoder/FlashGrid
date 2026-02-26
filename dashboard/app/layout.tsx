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
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-monad-darker antialiased">
        {children}
      </body>
    </html>
  );
}
