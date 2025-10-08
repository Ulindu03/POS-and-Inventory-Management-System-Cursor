import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Store for real-time POS process stats
interface PosProcessState {
  currentSales: number;
  currentOrderCount: number;
  updateCurrentSales: (amount: number) => void;
  incrementOrderCount: () => void;
  resetStats: () => void;
}

export const usePosProcessStore = create<PosProcessState>()(
  subscribeWithSelector((set) => ({
    currentSales: 0,
    currentOrderCount: 0,
    updateCurrentSales: (amount) => set({ currentSales: amount }),
    incrementOrderCount: () => set((state) => ({ currentOrderCount: state.currentOrderCount + 1 })),
    resetStats: () => set({ currentSales: 0, currentOrderCount: 0 }),
  }))
);

export const getRealTimePosStats = () => {
  const state = usePosProcessStore.getState();
  return {
    currentSales: state.currentSales,
    currentOrderCount: state.currentOrderCount
  };
};
