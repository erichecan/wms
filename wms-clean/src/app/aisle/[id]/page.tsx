"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AisleGrid } from "@/components/AisleGrid";
import { useWarehouseStore } from "@/store/warehouseStore";
import { ArrowLeft } from "lucide-react";

export default function AislePage() {
    const params = useParams();
    const router = useRouter();
    const aisleId = params.id as string;

    const initializeMockData = useWarehouseStore(s => s.initializeMockData);
    const bins = useWarehouseStore(s => s.bins);

    // Initialize store if empty
    useEffect(() => {
        if (bins.length === 0) {
            initializeMockData();
        }
    }, [bins.length, initializeMockData]);

    if (!aisleId) return null;

    return (
        <div className="flex-1 flex flex-col pt-6">
            <div className="max-w-5xl w-full mx-auto px-4 mb-4">
                <button
                    onClick={() => router.push("/")}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Home
                </button>
            </div>

            <AisleGrid aisleId={aisleId} />
        </div>
    );
}
