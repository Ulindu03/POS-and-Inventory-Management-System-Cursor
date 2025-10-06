import { create } from 'zustand';

export type CustomerType = 'retail' | 'wholesale';

interface PosState {
  customerType: CustomerType;
  setCustomerType: (type: CustomerType) => void;
  toggleCustomerType: () => void;
}

const STORAGE_KEY = 'vz_pos_customer_type';

const loadInitial = (): CustomerType => {
  if (typeof window === 'undefined') return 'retail';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'wholesale' ? 'wholesale' : 'retail';
  } catch {
    return 'retail';
  }
};

const persistType = (type: CustomerType) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, type);
  } catch {
    // ignore persistence failures
  }
};

export const usePosStore = create<PosState>((set, get) => ({
  customerType: loadInitial(),
  setCustomerType: (type) => {
    set({ customerType: type });
    persistType(type);
  },
  toggleCustomerType: () => {
    const next = get().customerType === 'retail' ? 'wholesale' : 'retail';
    set({ customerType: next });
    persistType(next);
  },
}));
