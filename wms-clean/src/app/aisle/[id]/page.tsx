"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AisleGrid } from "@/components/AisleGrid";
import { CsvImport } from "@/components/CsvImport";
import { useWarehouseStore, type WarehouseState } from "@/store/warehouseStore";
import { ArrowLeft } from "lucide-react";

export default function AislePage() {
    const params = useParams();
    const router = useRouter();
    const aisleId = params.id as string;

    const fetchBins = useWarehouseStore((s: WarehouseState) => s.fetchBins);
    const initializeMockData = useWarehouseStore((s: WarehouseState) => s.initializeMockData);
    const bins = useWarehouseStore((s: WarehouseState) => s.bins);

    // Fetch bins on mount
    useEffect(() => {
        fetchBins();
    }, [fetchBins]);

    if (!aisleId) return null;

    return (
        <div className="flex-1 flex flex-col pt-6">
            <div className="max-w-5xl w-full mx-auto px-4 mb-4">
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </button>
                    <button
                        onClick={() => {
                            if (confirm("Reset and seed database with mock data?")) {
                                initializeMockData();
                            }
                        }}
                        className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                    >
                        Reset Data
                    </button>
                </div>
            </div>

            <div className="max-w-5xl w-full mx-auto px-4 mb-6">
                <CsvImport />
            </div>

            <AisleGrid aisleId={aisleId} />
        </div>
    );
}
