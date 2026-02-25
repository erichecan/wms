import { create } from "zustand";

export interface Bin {
    id: string; // e.g. K1-L1-R1
    col: string; // K1, K2, K3, K4
    layer: number; // 1, 2, 3 (bottom to top)
    row: number; // e.g. 1 to 10
    sku: string | null;
    quantity: number;
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
                set({ bins: data });
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

    moveBinContents: (sourceIds, targetCol, targetRow, targetLayer) => set((state) => {
        const newBins = [...state.bins];
        const targetBin = newBins.find(b => b.col === targetCol && b.row === targetRow && b.layer === targetLayer);

        if (sourceIds.length === 1 && targetBin) {
            const sourceBin = newBins.find(b => b.id === sourceIds[0]);
            if (sourceBin) {
                // swap contents
                const tempSku = targetBin.sku;
                const tempQty = targetBin.quantity;
                const tempTime = targetBin.inboundTime;

                targetBin.sku = sourceBin.sku;
                targetBin.quantity = sourceBin.quantity;
                targetBin.inboundTime = sourceBin.inboundTime;

                sourceBin.sku = tempSku;
                sourceBin.quantity = tempQty;
                sourceBin.inboundTime = tempTime;
            }
        }

        return { bins: newBins, selectedBinIds: [] };
    }),

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
