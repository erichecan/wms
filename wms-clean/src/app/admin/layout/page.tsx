"use client";

import { useState } from "react";
import { LayoutBuilder } from "@/components/LayoutBuilder";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLayoutPage() {
    const router = useRouter();

    return (
        <div className="flex-1 flex flex-col p-6 h-[calc(100vh-80px)] overflow-hidden">
            <div className="flex items-center gap-4 mb-4">
                <button
                    onClick={() => router.push("/")}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Home
                </button>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                    Warehouse Layout Configuration
                </h2>
            </div>

            {/* Main Builder Canvas */}
            <LayoutBuilder />
        </div>
    );
}
