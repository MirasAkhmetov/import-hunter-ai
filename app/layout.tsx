import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { ToastContainer } from "@/components/ui/use-toast";
import { ClientProviders } from "@/components/ClientProviders";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "ImportHunter AI — Поиск прибыльных товаров для импорта",
  description:
    "AI-ассистент по поиску прибыльных товаров для импорта в Казахстан",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <ToastContainer>
          <ClientProviders />
          <Sidebar />
          <main className="ml-64 min-h-screen">
            <div className="p-8">{children}</div>
          </main>
        </ToastContainer>
      </body>
    </html>
  );
}
