import { create } from "zustand";

// Updated 2026-02-27T03:55:30Z - 支持一个 Bin 多个 SKU
export interface BinItem {
    sku: string;
    quantity: number;
}

export interface Bin {
    id: string; // e.g. K1-L1-R1
    col: string; // K1, K2, K3, K4
    layer: number; // 1, 2, 3 (bottom to top)
    row: number; // e.g. 1 to 10
    sku: string | null; // 兼容旧数据：主 SKU
    quantity: number; // 兼容旧数据：总数量
    items: BinItem[]; // 多 SKU 支持
    inboundTime: string | null; // ISO Date String
}

export type LayoutObstacle = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export type LayoutAisle = {
    id: string; // "K1"
    x: number;
    y: number;
    width: number;
    height: number;
}

export type GridDimension = {
    cols: number; // X axis
    rows: number; // Y axis
}

export interface WarehouseState {
    bins: Bin[];
    selectedBinIds: string[];
    dimensions: GridDimension;
    obstacles: LayoutObstacle[];
    aisles: LayoutAisle[];

    // Actions
    fetchBins: () => Promise<void>;
    initializeMockData: () => Promise<void>;
    selectBin: (id: string) => void;
    toggleBinSelection: (id: string) => void;
    clearSelection: () => void;
    moveBinContents: (sourceIds: string[], targetCol: string, targetRow: number, targetLayer: number) => void;
    // Layout Actions
    updateDimensions: (width: number, height: number) => void;
    addObstacle: (obstacle: LayoutObstacle) => void;
    updateAislePosition: (id: string, x: number, y: number) => void;
    updateObstaclePosition: (id: string, x: number, y: number) => void;
    updateBin: (id: string, updates: Partial<Bin>) => void;
}

export const useWarehouseStore = create<WarehouseState>((set) => ({
    bins: [],
    selectedBinIds: [],
    dimensions: { cols: 30, rows: 20 },
    obstacles: [
        { id: 'pillar-1', x: 10, y: 5, width: 2, height: 2 },
        { id: 'pillar-2', x: 20, y: 15, width: 2, height: 2 }
    ],
    aisles: [
        { id: 'K1', x: 2, y: 2, width: 2, height: 10 },
        { id: 'K2', x: 6, y: 2, width: 2, height: 10 },
        { id: 'K3', x: 14, y: 2, width: 2, height: 10 },
        { id: 'K4', x: 18, y: 2, width: 2, height: 10 }
    ],

    fetchBins: async () => {
        try {
            const res = await fetch("/api/bins");
            const data = await res.json();
            if (Array.isArray(data)) {
                // 兼容旧数据：如果 bin 没有 items 字段，从 sku/quantity 生成
                const normalized = data.map((b: Bin) => ({
                    ...b,
                    items: Array.isArray(b.items) && b.items.length > 0
                        ? b.items
                        : b.sku ? [{ sku: b.sku, quantity: b.quantity }] : []
                }));
                set({ bins: normalized });
            }
        } catch (error) {
            console.error("Failed to fetch bins", error);
        }
    },

    initializeMockData: async () => {
        try {
            await fetch("/api/seed", { method: "POST" });
            const res = await fetch("/api/bins");
            const data = await res.json();
            if (Array.isArray(data)) {
                set({ bins: data });
            }
        } catch (error) {
            console.error("Failed to initialize data", error);
        }
    },

    selectBin: (id) => set({ selectedBinIds: [id] }),

    toggleBinSelection: (id) => set((state) => ({
        selectedBinIds: state.selectedBinIds.includes(id)
            ? state.selectedBinIds.filter(b => b !== id)
            : [...state.selectedBinIds, id]
    })),

    clearSelection: () => set({ selectedBinIds: [] }),

    // Updated 2026-02-27T05:15:00Z - 支持多选批量移动、items 数组合并，移动后持久化
    moveBinContents: (sourceIds, targetCol, targetRow, targetLayer) => {
        const toPersist: { id: string; updates: Partial<Bin> }[] = [];
        let targetIdForLog = "";

        set((state) => {
            const newBins = state.bins.map(b => ({ ...b, items: [...(b.items || [])] }));
            const targetBin = newBins.find(b => b.col === targetCol && b.row === targetRow && b.layer === targetLayer);
            if (!targetBin || sourceIds.length === 0) return state;

            const sourceBins = sourceIds
                .map(id => newBins.find(b => b.id === id))
                .filter((b): b is Bin => !!b && b.id !== targetBin.id);
            if (sourceBins.length === 0) return state;

            // 合并所有 source 的 items 到 target（同 SKU 数量相加）
            const mergedItems = new Map<string, number>();
            for (const bin of sourceBins) {
                const items = Array.isArray(bin.items) && bin.items.length > 0
                    ? bin.items
                    : bin.sku ? [{ sku: bin.sku, quantity: bin.quantity }] : [];
                for (const it of items) {
                    if (it.sku.trim()) {
                        mergedItems.set(it.sku, (mergedItems.get(it.sku) || 0) + it.quantity);
                    }
                }
            }
            const existingItems = Array.isArray(targetBin.items) && targetBin.items.length > 0
                ? targetBin.items
                : targetBin.sku ? [{ sku: targetBin.sku, quantity: targetBin.quantity }] : [];
            for (const it of existingItems) {
                if (it.sku.trim()) {
                    mergedItems.set(it.sku, (mergedItems.get(it.sku) || 0) + it.quantity);
                }
            }
            const finalItems = Array.from(mergedItems.entries()).map(([sku, quantity]) => ({ sku, quantity }));
            const totalQty = finalItems.reduce((s, i) => s + i.quantity, 0);

            targetBin.items = finalItems;
            targetBin.sku = finalItems[0]?.sku || null;
            targetBin.quantity = totalQty;
            targetBin.inboundTime = targetBin.inboundTime || new Date().toISOString();

            targetIdForLog = targetBin.id;
            toPersist.push({
                id: targetBin.id,
                updates: { items: finalItems, sku: targetBin.sku, quantity: totalQty }
            });

            for (const bin of sourceBins) {
                bin.items = [];
                bin.sku = null;
                bin.quantity = 0;
                toPersist.push({ id: bin.id, updates: { items: [], sku: null, quantity: 0 } });
            }

            return { bins: newBins, selectedBinIds: [] };
        });

        toPersist.forEach(({ id, updates }) => {
            fetch("/api/bins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, updates }) })
                .catch(err => console.error("Failed to persist bin move", id, err));
        });
        if (targetIdForLog && sourceIds.length > 0) {
            fetch("/api/bins/move-log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sourceIds, targetId: targetIdForLog })
            }).catch(err => console.error("Failed to log bin move", err));
        }
    },

    updateDimensions: (cols, rows) => set({ dimensions: { cols, rows } }),
    addObstacle: (obstacle) => set((state) => ({ obstacles: [...state.obstacles, obstacle] })),
    updateAislePosition: (id, x, y) => set((state) => ({
        aisles: state.aisles.map(a => a.id === id ? { ...a, x, y } : a)
    })),
    updateObstaclePosition: (id: string, x: number, y: number) => set((state) => ({
        obstacles: state.obstacles.map(o => o.id === id ? { ...o, x, y } : o)
    })),
    updateBin: async (id, updates) => {
        // Optimistic update
        set((state) => ({
            bins: state.bins.map(b => b.id === id ? { ...b, ...updates } : b)
        }));

        try {
            await fetch("/api/bins", {
                method: "POST",
                body: JSON.stringify({ id, updates })
            });
        } catch (error) {
            console.error("Failed to update bin on backend", error);
        }
    }
}));
