import { create } from "zustand";

// Updated 2026-02-27T03:55:30Z - 支持一个 Bin 多个 SKU
export interface BinItem {
    sku: string;
    quantity: number;
}

export interface Bin {
    id: string; // e.g. K1-L1-R1
    col: string; // K1, K2, K3, K4
    rack: number; // 1, 2, 3 (bottom to top, 货架)
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
    moveBinContents: (sourceIds: string[], targetCol: string, targetRow: number, targetRack: number) => void;
    pendingSkuMove: { sourceBinId: string; sku: string; quantity: number } | null;
    setPendingSkuMove: (p: { sourceBinId: string; sku: string; quantity: number } | null) => void;
    moveSkuToBin: (sourceBinId: string, sku: string, qty: number, targetBinId: string) => void;
    // Layout Actions
    updateDimensions: (width: number, height: number) => void;
    addObstacle: (obstacle: LayoutObstacle) => void;
    updateAislePosition: (id: string, x: number, y: number) => void;
    updateObstaclePosition: (id: string, x: number, y: number) => void;
    updateBin: (id: string, updates: Partial<Bin>) => void;
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
    bins: [],
    selectedBinIds: [],
    pendingSkuMove: null,
    setPendingSkuMove: (p) => set({ pendingSkuMove: p }),
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
    moveBinContents: (sourceIds, targetCol, targetRow, targetRack) => {
        const toPersist: { id: string; updates: Partial<Bin> }[] = [];
        let targetIdForLog = "";
        const targetBinId = `${targetCol}-L${targetRack}-R${targetRow}`;

        set((state) => {
            const newBins = state.bins.map(b => ({ ...b, items: [...(b.items || [])] }));
            let targetBin = newBins.find(b => b.col === targetCol && b.row === targetRow && b.rack === targetRack);
            if (!targetBin) {
                targetBin = {
                    id: targetBinId,
                    col: targetCol,
                    row: targetRow,
                    rack: targetRack,
                    sku: null,
                    quantity: 0,
                    items: [],
                    inboundTime: null
                };
                newBins.push(targetBin);
            }
            if (sourceIds.length === 0) return state;

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

    // 2026-02-27 单个 SKU 跨托盘移动
    moveSkuToBin: (sourceBinId, sku, qty, targetBinId) => {
        const toPersist: { id: string; updates: Partial<Bin> }[] = [];
        set((state) => {
            const newBins = state.bins.map(b => ({ ...b, items: [...(b.items || [])] }));
            const sourceBin = newBins.find(b => b.id === sourceBinId);
            let targetBin = newBins.find(b => b.id === targetBinId);
            if (!sourceBin) return state;
            const sourceItems = Array.isArray(sourceBin.items) && sourceBin.items.length > 0 ? sourceBin.items : sourceBin.sku ? [{ sku: sourceBin.sku, quantity: sourceBin.quantity }] : [];
            const skuItem = sourceItems.find(it => it.sku === sku);
            if (!skuItem || skuItem.quantity < qty) return state;

            if (!targetBin) {
                const m = targetBinId.match(/^([A-Za-z0-9]+)-L(\d+)-R(\d+)$/);
                targetBin = { id: targetBinId, col: m?.[1] ?? "K1", row: parseInt(m?.[3] ?? "1", 10), rack: parseInt(m?.[2] ?? "1", 10), sku: null, quantity: 0, items: [], inboundTime: null };
                newBins.push(targetBin);
            }

            const moveQty = Math.min(qty, skuItem.quantity);
            const newSourceItems = sourceItems.map(it => it.sku === sku ? { ...it, quantity: it.quantity - moveQty } : it).filter(it => it.quantity > 0);
            const targetItems = Array.isArray(targetBin.items) && targetBin.items.length > 0 ? targetBin.items : targetBin.sku ? [{ sku: targetBin.sku, quantity: targetBin.quantity }] : [];
            const existingTarget = targetItems.find(it => it.sku === sku);
            const newTargetItems = existingTarget ? targetItems.map(it => it.sku === sku ? { ...it, quantity: it.quantity + moveQty } : it) : [...targetItems, { sku, quantity: moveQty }];

            const srcTotal = newSourceItems.reduce((s, i) => s + i.quantity, 0);
            const tgtTotal = newTargetItems.reduce((s, i) => s + i.quantity, 0);

            sourceBin.items = newSourceItems;
            sourceBin.sku = newSourceItems[0]?.sku || null;
            sourceBin.quantity = srcTotal;
            targetBin.items = newTargetItems;
            targetBin.sku = newTargetItems[0]?.sku || null;
            targetBin.quantity = tgtTotal;

            toPersist.push({ id: sourceBin.id, updates: { items: newSourceItems, sku: sourceBin.sku, quantity: srcTotal } });
            toPersist.push({ id: targetBin.id, updates: { items: newTargetItems, sku: targetBin.sku, quantity: tgtTotal } });
            return { bins: newBins, pendingSkuMove: null };
        });
        toPersist.forEach(({ id, updates }) => {
            fetch("/api/bins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, updates }) }).catch(err => console.error("Failed to persist sku move", id, err));
        });
        fetch("/api/bins/move-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceIds: [sourceBinId], targetId: targetBinId }) }).catch(() => {});
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
