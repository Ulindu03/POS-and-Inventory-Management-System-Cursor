// Shopping cart state management using Zustand for POS system
import { create } from 'zustand';

export interface CartItem {
	id: string;
	name: string;
	price: number; // Effective unit price (after discounts)
	qty: number;
	barcode?: string;
	barcodes?: string[]; // Track multiple barcodes when qty > 1
	basePrice?: number; // Original unit price before discounts
	discountAmount?: number; // Per-unit savings
	discountType?: 'percentage' | 'fixed';
	discountValue?: number;
	discountExpiry?: string; // ISO date string for discount expiry
	priceTier?: 'retail' | 'wholesale';
}

export interface AppliedExchangeSlip {
	slipNo: string;
	totalValue: number;
	expiryDate?: string;
	customerName?: string;
}

interface CartState {
	items: CartItem[];
	discount: number; // manual discount (e.g., promo code)
	taxRate: number; // as decimal, e.g., 0.0 for now
	promoCode?: string | null;
	holdTicketId?: string | null;
	holdTicketNo?: string | null;
	exchangeSlip: AppliedExchangeSlip | null;
	addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
	inc: (id: string) => void;
	dec: (id: string) => void;
	remove: (id: string) => void;
	clear: () => void;
	setDiscount: (amount: number) => void;
	setPromoCode: (code: string | null) => void;
	setHold: (ticket: { id: string; invoiceNo: string } | null) => void;
	applyExchangeSlip: (slip: AppliedExchangeSlip) => void;
	clearExchangeSlip: () => void;
	subtotal: () => number;
	tax: () => number;
	autoDiscount: () => number;
	totalDiscount: () => number;
	total: () => number;
}

// Key for persisting cart data in localStorage
const STORAGE_KEY = 'vz_cart_v1';

// Load cart data from localStorage on app startup
const loadInitial = (): Pick<CartState, 'items' | 'discount' | 'taxRate' | 'promoCode' | 'exchangeSlip'> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return { items: [], discount: 0, taxRate: 0, promoCode: null, exchangeSlip: null };
    const parsed = JSON.parse(raw);
	return {
		items: parsed.items || [],
		discount: parsed.discount || 0,
		taxRate: parsed.taxRate || 0,
		promoCode: parsed.promoCode || null,
		exchangeSlip: parsed.exchangeSlip || null,
	};
  } catch {
	return { items: [], discount: 0, taxRate: 0, promoCode: null, exchangeSlip: null };
  }
};

// Save cart data to localStorage whenever cart changes
const persist = (state: CartState) => {
	try {
		const snapshot = {
			items: state.items,
			discount: state.discount,
			taxRate: state.taxRate,
			promoCode: state.promoCode,
			exchangeSlip: state.exchangeSlip,
		};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {}
};

export const useCartStore = create<CartState>((set, get) => ({
	...loadInitial(),
	// Set hold ticket information for saving cart state
	setHold: (ticket) => {
		set(() => ({ holdTicketId: ticket?.id || null, holdTicketNo: ticket?.invoiceNo || null }));
		persist(get());
	},

	// Add item to cart or increase quantity if already exists
	addItem: (item, qty = 1) => {
		const basePrice = typeof item.basePrice === 'number' ? item.basePrice : item.price;
		const discountAmount = typeof item.discountAmount === 'number' ? item.discountAmount : Math.max(0, basePrice - item.price);
		const discountType = item.discountType;
		const discountValue = item.discountValue;
		const priceTier = item.priceTier;
		const newBarcode = item.barcode;
		
		set((state) => {
			const existing = state.items.find((i) => i.id === item.id);
			if (existing) {
				// Collect all barcodes: existing barcodes + new barcode
				const existingBarcodes = existing.barcodes || (existing.barcode ? [existing.barcode] : []);
				const updatedBarcodes = newBarcode && !existingBarcodes.includes(newBarcode)
					? [...existingBarcodes, newBarcode]
					: existingBarcodes;
				
				return {
					items: state.items.map((i) => (i.id === item.id ? {
						...i,
						qty: i.qty + qty,
						price: item.price,
						basePrice,
						discountAmount,
						discountType: discountType ?? i.discountType,
						discountValue: discountValue ?? i.discountValue,
						priceTier: priceTier ?? i.priceTier,
						barcodes: updatedBarcodes.length > 0 ? updatedBarcodes : undefined,
						barcode: updatedBarcodes[0], // Keep first barcode for compatibility
					} : i)),
				};
			}
			return {
				items: [
					...state.items,
					{
						...item,
						qty,
						basePrice,
						discountAmount,
						discountType,
						discountValue,
						priceTier,
						barcodes: newBarcode ? [newBarcode] : undefined,
					},
				],
			};
		});
		persist(get());
	},

	// Increase quantity of item by 1
	inc: (id) => {
		set((state) => ({ items: state.items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)) }));
		persist(get());
	},
	// Decrease quantity of item by 1, remove if quantity becomes 0
	dec: (id) => {
		set((state) => ({ items: state.items.map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0) }));
		persist(get());
	},
	// Remove item completely from cart
	remove: (id) => {
		set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
		persist(get());
	},
	// Clear all items from cart
	clear: () => {
		set({ items: [], discount: 0, promoCode: null, exchangeSlip: null });
		persist(get());
	},
	// Set discount amount (e.g., promo codes)
	setDiscount: (amount) => {
		set({ discount: Math.max(0, amount) });
		persist(get());
	},
	// Set promo code for discounts
	setPromoCode: (code) => {
		set({ promoCode: code });
		persist(get());
	},

	applyExchangeSlip: (slip) => {
		set({ exchangeSlip: slip });
		persist(get());
	},
	clearExchangeSlip: () => {
		set({ exchangeSlip: null });
		persist(get());
	},

	// Calculate subtotal (pre-discount sum)
	subtotal: () => get().items.reduce((sum, i) => {
		const unit = typeof i.basePrice === 'number' ? i.basePrice : i.price;
		return sum + unit * i.qty;
	}, 0),
	// Automatic discount derived from product promos
	autoDiscount: () => get().items.reduce((sum, i) => {
		const base = typeof i.basePrice === 'number' ? i.basePrice : i.price;
		const diff = base - i.price;
		return diff > 0 ? sum + diff * i.qty : sum;
	}, 0),
	// Calculate total discount combining automatic + manual adjustments
	totalDiscount: () => Math.max(0, get().autoDiscount() + get().discount),
	// Calculate tax amount based on discounted subtotal
	tax: () => Math.max(0, (get().subtotal() - get().totalDiscount()) * get().taxRate),
	// Calculate final total (subtotal + tax - discounts)
	total: () => Math.max(0, get().subtotal() + get().tax() - get().totalDiscount()),
}));


