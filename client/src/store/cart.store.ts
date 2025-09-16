// Shopping cart state management using Zustand for POS system
import { create } from 'zustand';

export interface CartItem {
	id: string;
	name: string;
	price: number; // LKR per unit
	qty: number;
	barcode?: string;
}

interface CartState {
	items: CartItem[];
	discount: number; // absolute amount in LKR
	taxRate: number; // as decimal, e.g., 0.0 for now
	promoCode?: string | null;
	holdTicketId?: string | null;
	holdTicketNo?: string | null;
	addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
	inc: (id: string) => void;
	dec: (id: string) => void;
	remove: (id: string) => void;
	clear: () => void;
	setDiscount: (amount: number) => void;
		setPromoCode: (code: string | null) => void;
	setHold: (ticket: { id: string; invoiceNo: string } | null) => void;
	subtotal: () => number;
	tax: () => number;
	total: () => number;
}

// Key for persisting cart data in localStorage
const STORAGE_KEY = 'vz_cart_v1';

// Load cart data from localStorage on app startup
const loadInitial = (): Pick<CartState, 'items' | 'discount' | 'taxRate' | 'promoCode'> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return { items: [], discount: 0, taxRate: 0, promoCode: null };
    const parsed = JSON.parse(raw);
	return { items: parsed.items || [], discount: parsed.discount || 0, taxRate: parsed.taxRate || 0, promoCode: parsed.promoCode || null };
  } catch {
	return { items: [], discount: 0, taxRate: 0, promoCode: null };
  }
};

// Save cart data to localStorage whenever cart changes
const persist = (state: CartState) => {
	try {
		const snapshot = { items: state.items, discount: state.discount, taxRate: state.taxRate, promoCode: state.promoCode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {}
};

export const useCartStore = create<CartState>((set, get) => ({
	...loadInitial(),
	// Set hold ticket information for saving cart state
	setHold: (ticket) => set(() => ({ holdTicketId: ticket?.id || null, holdTicketNo: ticket?.invoiceNo || null })),

	// Add item to cart or increase quantity if already exists
	addItem: (item, qty = 1) => {
		set((state) => {
			const existing = state.items.find((i) => i.id === item.id);
			if (existing) {
				return {
					items: state.items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i)),
				};
			}
			return { items: [...state.items, { ...item, qty }] };
		});
		persist(get());
	},

	// Increase quantity of item by 1
	inc: (id) => set((s) => { const next = { items: s.items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)), discount: s.discount, taxRate: s.taxRate } as any; persist({ ...s, ...next } as CartState); return next; }),
	// Decrease quantity of item by 1, remove if quantity becomes 0
	dec: (id) => set((s) => { const items = s.items.map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0); const next = { items, discount: s.discount, taxRate: s.taxRate } as any; persist({ ...s, ...next } as CartState); return next; }),
	// Remove item completely from cart
	remove: (id) => set((s) => { const next = { items: s.items.filter((i) => i.id !== id), discount: s.discount, taxRate: s.taxRate } as any; persist({ ...s, ...next } as CartState); return next; }),
	// Clear all items from cart
	clear: () => { set({ items: [], discount: 0, promoCode: null }); persist({ ...get(), items: [], discount: 0, promoCode: null } as CartState); },
	// Set discount amount (absolute value in LKR)
	setDiscount: (amount) => { set({ discount: Math.max(0, amount) }); persist(get()); },
	// Set promo code for discounts
	setPromoCode: (code) => { set({ promoCode: code }); persist(get()); },

	// Calculate subtotal (sum of all item prices * quantities)
	subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
	// Calculate tax amount based on subtotal and tax rate
	tax: () => get().subtotal() * get().taxRate,
	// Calculate final total (subtotal + tax - discount)
	total: () => Math.max(0, get().subtotal() + get().tax() - get().discount),
}));


