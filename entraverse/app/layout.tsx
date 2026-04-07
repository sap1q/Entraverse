import type { Metadata } from "next";
import "react-easy-crop/react-easy-crop.css";
import { MainLayout } from "@/src/components/layout/MainLayout";
import { SentryBootstrap } from "@/src/components/providers/SentryBootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entraverse",
  description: "Entraverse e-commerce storefront",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SentryBootstrap />
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
