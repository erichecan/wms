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
        <html lang="en">
            <body className="antialiased bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 min-h-screen">
                <main className="flex flex-col min-h-screen">
                    <nav className="glass sticky top-0 z-50 p-4 shadow-sm flex items-center justify-between">
                        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">WMS Pro</h1>
                    </nav>
                    {children}
                </main>
            </body>
        </html>
    );
}
