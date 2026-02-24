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
    initializeMockData: () => void;
    selectBin: (id: string) => void;
    toggleBinSelection: (id: string) => void;
    clearSelection: () => void;
    moveBinContents: (sourceIds: string[], targetCol: string, targetRow: number, targetLayer: number) => void;
    // Layout Actions
    updateDimensions: (width: number, height: number) => void;
    addObstacle: (obstacle: LayoutObstacle) => void;
    updateAislePosition: (id: string, x: number, y: number) => void;
    updateObstaclePosition: (id: string, x: number, y: number) => void;
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

    initializeMockData: () => {
        // Generate a simple mock grid for columns K1, K2, K3, K4
        const cols = ["K1", "K2", "K3", "K4"];
        const mockBins: Bin[] = [];

        cols.forEach(col => {
            // 10 rows deeper
            for (let r = 1; r <= 10; r++) {
                // 3 layers high
                for (let l = 1; l <= 3; l++) {
                    // Add some fake items randomly
                    const hasItem = Math.random() > 0.6;
                    mockBins.push({
                        id: `${col}-L${l}-R${r}`,
                        col,
                        row: r,
                        layer: l,
                        sku: hasItem ? `SKU-A${Math.floor(Math.random() * 900) + 100}` : null,
                        quantity: hasItem ? Math.floor(Math.random() * 50) + 1 : 0,
                        inboundTime: hasItem ? new Date(Date.now() - Math.random() * 10000000000).toISOString() : null
                    });
                }
            }
        });

        set({ bins: mockBins });
    },

    selectBin: (id) => set({ selectedBinIds: [id] }),

    toggleBinSelection: (id) => set((state) => ({
        selectedBinIds: state.selectedBinIds.includes(id)
            ? state.selectedBinIds.filter(b => b !== id)
            : [...state.selectedBinIds, id]
    })),

    clearSelection: () => set({ selectedBinIds: [] }),

    moveBinContents: (sourceIds, targetCol, targetRow, targetLayer) => set((state) => {
        // Deep copy to avoid direct mutation
        const newBins = [...state.bins];

        const targetBinIndex = newBins.findIndex(b => b.col === targetCol && b.row === targetRow && b.layer === targetLayer);

        if (sourceIds.length === 1 && targetBinIndex !== -1) {
            const sourceBinIndex = newBins.findIndex(b => b.id === sourceIds[0]);
            if (sourceBinIndex !== -1) {
                // swap contents
                const tempSku = newBins[targetBinIndex].sku;
                const tempQty = newBins[targetBinIndex].quantity;
                const tempTime = newBins[targetBinIndex].inboundTime;

                newBins[targetBinIndex].sku = newBins[sourceBinIndex].sku;
                newBins[targetBinIndex].quantity = newBins[sourceBinIndex].quantity;
                newBins[targetBinIndex].inboundTime = newBins[sourceBinIndex].inboundTime;

                newBins[sourceBinIndex].sku = tempSku;
                newBins[sourceBinIndex].quantity = tempQty;
                newBins[sourceBinIndex].inboundTime = tempTime;
            }
        }

        return { bins: newBins, selectedBinIds: [] };
    }),

    updateDimensions: (cols, rows) => set({ dimensions: { cols, rows } }),
    addObstacle: (obstacle) => set((state) => ({ obstacles: [...state.obstacles, obstacle] })),
    updateAislePosition: (id, x, y) => set((state) => ({
        aisles: state.aisles.map(a => a.id === id ? { ...a, x, y } : a)
    })),
    updateObstaclePosition: (id, x, y) => set((state) => ({
        obstacles: state.obstacles.map(o => o.id === id ? { ...o, x, y } : o)
    }))
}));
