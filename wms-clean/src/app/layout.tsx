import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Warehouse Management System",
    description: "Modern WMS with 2D/3D isometric views and drag-and-drop",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-CN">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body className="antialiased bg-white dark:bg-zinc-950 text-black dark:text-zinc-100 min-h-screen font-sans">
                <main className="flex flex-col min-h-screen">
                    <nav className="glass sticky top-0 z-50 px-6 py-4 shadow-sm flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                        <h1 className="text-xl font-bold tracking-tight text-black dark:text-white">
                            <span className="text-[#D94828]">W</span>MS Pro
                        </h1>
                    </nav>
                    {children}
                </main>
            </body>
        </html>
    );
}
