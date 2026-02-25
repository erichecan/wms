"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { useWarehouseStore, type WarehouseState } from "@/store/warehouseStore";

export function CsvImport() {
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ updated: number; errors: number; details: string[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fetchBins = useWarehouseStore((s: WarehouseState) => s.fetchBins);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".csv")) {
            setError("Please upload a valid CSV file.");
            return;
        }

        setIsUploading(true);
        setError(null);
        setResult(null);

        try {
            const reader = new FileReader();
            reader.onload = async (e: ProgressEvent<FileReader>) => { // Explicit type for event
                const text = e.target?.result as string;

                try {
                    const response = await fetch("/api/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ csvData: text }),
                    });

                    const data = await response.json() as { updated: number, errors: number, details: string[] };

                    if (!response.ok) {
                        throw new Error((data as any).error || "Failed to import CSV");
                    }

                    setResult(data);
                    await fetchBins(); // Refresh the grid
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsUploading(false);
                }
            };
            reader.readAsText(file);
        } catch (err) {
            setError("Failed to read file");
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <Upload className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Lingxing CSV Import</h3>
                        <p className="text-xs text-slate-400">Update inventory in bulk</p>
                    </div>
                </div>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Select File
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv"
                    className="hidden"
                />
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {result && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3 text-emerald-400 text-sm">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Success: {result.updated} bins updated. {result.errors > 0 && `${result.errors} skipped.`}</span>
                    </div>
                    {result.details.length > 0 && (
                        <div className="text-[10px] text-slate-500 font-mono mt-1 max-h-20 overflow-y-auto">
                            {result.details.map((d, i) => <div key={i}>{d}</div>)}
                        </div>
                    )}
                </div>
            )}

            <div className="text-[10px] text-slate-500">
                Supported headers: SKU, Quantity (可用库存), Bin (库位)
            </div>
        </div>
    );
}
