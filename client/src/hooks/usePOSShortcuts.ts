/**
 * POS Keyboard Shortcuts Hook
 * 
 * Comprehensive keyboard navigation system for ultra-fast POS operations.
 * Inspired by global POS standards with optimizations for Sri Lankan retail.
 * 
 * SHORTCUT REFERENCE:
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🔑 GLOBAL SHORTCUTS
 * ───────────────────────────────────────────────────────────────────────────
 * F1              Focus product search
 * F2              Focus cart / Jump to cart
 * F4              Hold current sale
 * F8              Resume held sale
 * F9              Open payment modal (Pay)
 * Escape          Close modal / Cancel operation
 * Ctrl + L        Logout
 * Ctrl + F        Focus product search (alternative)
 * ?               Show/hide shortcut help
 * 
 * 🛒 PRODUCT GRID NAVIGATION
 * ───────────────────────────────────────────────────────────────────────────
 * Arrow Keys      Navigate product cards
 * Enter           Add selected product to cart
 * Tab             Toggle Retail/Wholesale mode
 * 
 * 🛍️ CART NAVIGATION
 * ───────────────────────────────────────────────────────────────────────────
 * ↑ / ↓           Navigate cart items (when cart focused)
 * +               Increase quantity of selected item
 * -               Decrease quantity of selected item
 * Delete          Remove selected item
 * Ctrl + Delete   Clear all cart items
 * 
 * 💳 PAYMENT & ACTIONS
 * ───────────────────────────────────────────────────────────────────────────
 * F9              Pay / Open payment
 * Enter           Confirm payment (in payment modal)
 * Ctrl + P        Print receipt
 * Ctrl + R        Open return modal
 * Ctrl + E        Open exchange modal
 * Ctrl + D        Open damage modal
 * 
 * ⚡ QUANTITY PRESETS (when product selected)
 * ───────────────────────────────────────────────────────────────────────────
 * 1-9             Set quantity (1-9)
 * 0               Custom quantity input
 * 
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cart.store';
import { usePosStore } from '@/store/pos.store';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

export type POSFocusArea = 'products' | 'cart' | 'payment' | 'modal';

export interface POSShortcutsConfig {
  /** Callback when payment modal should open */
  onPay?: () => void;
  /** Callback when hold should be triggered */
  onHold?: () => void;
  /** Callback when resume held sale should be triggered */
  onResume?: () => void;
  /** Callback when damage modal should open */
  onDamage?: () => void;
  /** Callback when return modal should open */
  onReturn?: () => void;
  /** Callback when exchange modal should open */
  onExchange?: () => void;
  /** Callback when clear cart is triggered */
  onClear?: () => void;
  /** Callback when print is triggered */
  onPrint?: () => void;
  /** Callback to show shortcut help */
  onShowHelp?: () => void;
  /** Callback to focus product search input */
  onFocusProductSearch?: () => void;
  /** Callback to focus cart */
  onFocusCart?: () => void;
  /** Current focus area */
  focusArea: POSFocusArea;
  /** Set current focus area */
  setFocusArea: (area: POSFocusArea) => void;
  /** Is any modal open? */
  isModalOpen?: boolean;
  /** Selected product index in grid */
  selectedProductIndex: number;
  /** Set selected product index */
  setSelectedProductIndex: (index: number) => void;
  /** Selected cart item index */
  selectedCartIndex: number;
  /** Set selected cart item index */
  setSelectedCartIndex: (index: number) => void;
  /** Total products count for navigation bounds */
  productCount: number;
  /** Products per row for grid navigation */
  productsPerRow?: number;
  /** Product list for adding items */
  products?: Array<{
    _id: string;
    name: { en: string };
    barcode?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pricing?: Record<string, any>;
    effectiveStock?: { current?: number };
    inventory?: { currentStock?: number };
    stock?: { current?: number };
  }>;
}

export const usePOSShortcuts = (config: POSShortcutsConfig) => {
  const {
    onPay,
    onHold,
    onResume,
    onDamage,
    onReturn,
    onExchange,
    onPrint,
    onShowHelp,
    onFocusProductSearch,
    onFocusCart,
    focusArea,
    setFocusArea,
    isModalOpen = false,
    selectedProductIndex,
    setSelectedProductIndex,
    selectedCartIndex,
    setSelectedCartIndex,
    productCount,
    productsPerRow = 5,
    products = [],
  } = config;

  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const {
    items: cartItems,
    inc,
    dec,
    remove,
    clear,
    addItem,
  } = useCartStore();
  const { toggleCustomerType, customerType } = usePosStore();

  // Add product from grid by index
  const addProductByIndex = useCallback((index: number) => {
    if (index < 0 || index >= products.length) return;
    
    const p = products[index];
    const eff = p.effectiveStock || undefined;
    const current = (eff?.current ?? p.inventory?.currentStock ?? p.stock?.current ?? 0);
    
    if (current <= 0) {
      toast.error('Out of stock');
      return;
    }

    const pricing = p.pricing;
    const retailTier = pricing?.retail;
    const wholesaleTier = pricing?.wholesale;
    const wholesaleAvailable = Boolean(wholesaleTier?.configured && wholesaleTier.base > 0);
    const prefersWholesale = customerType === 'wholesale' && wholesaleAvailable;
    const activeTier = prefersWholesale ? wholesaleTier : retailTier ?? wholesaleTier;
    const activeTierName = prefersWholesale && activeTier ? 'wholesale' : 'retail';
    const basePrice = activeTier?.base ?? (prefersWholesale ? wholesaleTier?.base : retailTier?.base) ?? 0;
    const finalPrice = activeTier?.final ?? basePrice;
    const perUnitSavings = Math.max(0, activeTier?.discountAmount ?? 0);
    const discountType = activeTier?.discountType ?? null;
    const discountValue = activeTier?.discountValue ?? null;

    addItem({
      id: p._id,
      name: p.name.en,
      price: finalPrice,
      basePrice,
      barcode: p.barcode, // Include product's default barcode
      discountAmount: perUnitSavings,
      discountType: discountType ?? undefined,
      discountValue: discountValue ?? undefined,
      priceTier: activeTierName,
    });

    toast.success(`Added: ${p.name.en}`);
    if (navigator.vibrate) navigator.vibrate(60);
  }, [products, customerType, addItem]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const tagName = target?.tagName?.toLowerCase();
    const isInputFocused = tagName === 'input' || tagName === 'textarea' || target?.isContentEditable;

    // Always allow these shortcuts regardless of input focus
    const allowedInInput = ['Escape', 'F1', 'F2', 'F4', 'F6', 'F8', 'F9'];
    
    // Check for modifier keys
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    // ═══════════════════════════════════════════════════════════════
    // ESCAPE - Always works to close/cancel
    // ═══════════════════════════════════════════════════════════════
    if (e.key === 'Escape') {
      if (isModalOpen) {
        // Let modal handle its own Escape
        return;
      }
      // Clear focus, deselect
      (document.activeElement as HTMLElement)?.blur();
      setSelectedProductIndex(-1);
      setSelectedCartIndex(-1);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // FUNCTION KEYS - Work from anywhere
    // ═══════════════════════════════════════════════════════════════
    if (e.key === 'F1') {
      e.preventDefault();
      onFocusProductSearch?.();
      setFocusArea('products');
      return;
    }

    if (e.key === 'F2') {
      e.preventDefault();
      setFocusArea('cart');
      onFocusCart?.();
      if (cartItems.length > 0 && selectedCartIndex < 0) {
        setSelectedCartIndex(0);
      }
      return;
    }

    if (e.key === 'F4') {
      e.preventDefault();
      onHold?.();
      return;
    }

    if (e.key === 'F8') {
      e.preventDefault();
      onResume?.();
      return;
    }

    if (e.key === 'F9') {
      e.preventDefault();
      if (cartItems.length > 0) {
        onPay?.();
      } else {
        toast.error('Cart is empty');
      }
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // CTRL + KEY SHORTCUTS
    // ═══════════════════════════════════════════════════════════════
    if (isCtrl) {
      switch (e.key.toLowerCase()) {
        case 'l':
          e.preventDefault();
          logout();
          navigate('/login');
          return;

        case 'f':
          e.preventDefault();
          onFocusProductSearch?.();
          setFocusArea('products');
          return;

        case 'p':
          e.preventDefault();
          onPrint?.();
          return;

        case 'r':
          e.preventDefault();
          onReturn?.();
          return;

        case 'e':
          e.preventDefault();
          onExchange?.();
          return;

        case 'd':
          e.preventDefault();
          onDamage?.();
          return;

        case 'delete':
        case 'backspace':
          e.preventDefault();
          if (isShift || e.key === 'Delete') {
            clear();
            toast.info('Cart cleared');
          }
          return;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // HELP SHORTCUT
    // ═══════════════════════════════════════════════════════════════
    if (e.key === '?' && !isInputFocused) {
      e.preventDefault();
      onShowHelp?.();
      return;
    }

    // If in input field, don't process remaining shortcuts
    if (isInputFocused && !allowedInInput.includes(e.key)) {
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // BLOCK REMAINING SHORTCUTS WHEN MODAL IS OPEN
    // ═══════════════════════════════════════════════════════════════
    // When a modal is open, don't process Tab, Arrow keys, etc.
    // Let the modal handle its own keyboard navigation
    if (isModalOpen) {
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // TAB - Toggle Retail/Wholesale
    // ═══════════════════════════════════════════════════════════════
    if (e.key === 'Tab' && !isShift && focusArea === 'products') {
      e.preventDefault();
      toggleCustomerType();
      toast.info(`Switched to ${customerType === 'retail' ? 'Wholesale' : 'Retail'} mode`);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // PRODUCT GRID NAVIGATION
    // ═══════════════════════════════════════════════════════════════
    if (focusArea === 'products' && productCount > 0) {
      const currentIndex = selectedProductIndex >= 0 ? selectedProductIndex : 0;
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = Math.max(0, currentIndex - 1);
          setSelectedProductIndex(newIndex);
          return;

        case 'ArrowRight':
          e.preventDefault();
          newIndex = Math.min(productCount - 1, currentIndex + 1);
          setSelectedProductIndex(newIndex);
          return;

        case 'ArrowUp':
          e.preventDefault();
          newIndex = Math.max(0, currentIndex - productsPerRow);
          setSelectedProductIndex(newIndex);
          return;

        case 'ArrowDown':
          e.preventDefault();
          newIndex = Math.min(productCount - 1, currentIndex + productsPerRow);
          setSelectedProductIndex(newIndex);
          return;

        case 'Enter':
          e.preventDefault();
          if (selectedProductIndex >= 0) {
            addProductByIndex(selectedProductIndex);
          }
          return;

        case 'Home':
          e.preventDefault();
          setSelectedProductIndex(0);
          return;

        case 'End':
          e.preventDefault();
          setSelectedProductIndex(productCount - 1);
          return;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // CART NAVIGATION
    // ═══════════════════════════════════════════════════════════════
    if (focusArea === 'cart' && cartItems.length > 0) {
      const currentIndex = selectedCartIndex >= 0 ? selectedCartIndex : 0;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedCartIndex(Math.max(0, currentIndex - 1));
          return;

        case 'ArrowDown':
          e.preventDefault();
          setSelectedCartIndex(Math.min(cartItems.length - 1, currentIndex + 1));
          return;

        case '+':
        case '=':
          e.preventDefault();
          if (selectedCartIndex >= 0 && selectedCartIndex < cartItems.length) {
            inc(cartItems[selectedCartIndex].id);
          }
          return;

        case '-':
        case '_':
          e.preventDefault();
          if (selectedCartIndex >= 0 && selectedCartIndex < cartItems.length) {
            dec(cartItems[selectedCartIndex].id);
          }
          return;

        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (selectedCartIndex >= 0 && selectedCartIndex < cartItems.length) {
            remove(cartItems[selectedCartIndex].id);
            // Adjust selection after removal
            if (selectedCartIndex >= cartItems.length - 1) {
              setSelectedCartIndex(Math.max(0, cartItems.length - 2));
            }
          }
          return;

        case 'Enter':
          e.preventDefault();
          // Could open quantity edit modal - for now just increase
          if (selectedCartIndex >= 0 && selectedCartIndex < cartItems.length) {
            inc(cartItems[selectedCartIndex].id);
          }
          return;

        case 'Home':
          e.preventDefault();
          setSelectedCartIndex(0);
          return;

        case 'End':
          e.preventDefault();
          setSelectedCartIndex(cartItems.length - 1);
          return;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // NUMBER KEYS FOR QUICK QUANTITY (when product selected in grid)
    // ═══════════════════════════════════════════════════════════════
    if (!isInputFocused && focusArea === 'products' && selectedProductIndex >= 0) {
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const qty = parseInt(e.key);
        const p = products[selectedProductIndex];
        if (p) {
          const pricing = p.pricing;
          const retailTier = pricing?.retail;
          const wholesaleTier = pricing?.wholesale;
          const wholesaleAvailable = Boolean(wholesaleTier?.configured && wholesaleTier.base > 0);
          const prefersWholesale = customerType === 'wholesale' && wholesaleAvailable;
          const activeTier = prefersWholesale ? wholesaleTier : retailTier ?? wholesaleTier;
          const activeTierName = prefersWholesale && activeTier ? 'wholesale' : 'retail';
          const basePrice = activeTier?.base ?? 0;
          const finalPrice = activeTier?.final ?? basePrice;
          const perUnitSavings = Math.max(0, activeTier?.discountAmount ?? 0);
          const discountType = activeTier?.discountType ?? null;
          const discountValue = activeTier?.discountValue ?? null;

          addItem({
            id: p._id,
            name: p.name.en,
            price: finalPrice,
            basePrice,
            discountAmount: perUnitSavings,
            discountType: discountType ?? undefined,
            discountValue: discountValue ?? undefined,
            priceTier: activeTierName,
          }, qty);

          toast.success(`Added ${qty}x ${p.name.en}`);
          if (navigator.vibrate) navigator.vibrate(60);
        }
        return;
      }
    }

  }, [
    isModalOpen,
    focusArea,
    setFocusArea,
    onFocusProductSearch,
    onFocusCart,
    selectedProductIndex,
    setSelectedProductIndex,
    selectedCartIndex,
    setSelectedCartIndex,
    productCount,
    productsPerRow,
    products,
    cartItems,
    customerType,
    addItem,
    addProductByIndex,
    inc,
    dec,
    remove,
    clear,
    toggleCustomerType,
    logout,
    navigate,
    onPay,
    onHold,
    onResume,
    onDamage,
    onReturn,
    onExchange,
    onPrint,
    onShowHelp,
  ]);

  // Attach/detach keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    focusArea,
    setFocusArea,
    selectedProductIndex,
    setSelectedProductIndex,
    selectedCartIndex,
    setSelectedCartIndex,
  };
};

/**
 * Shortcut definitions for help overlay
 */
export const POS_SHORTCUTS = {
  global: [
    { key: 'F1', action: 'Focus product search' },
    { key: 'F2', action: 'Jump to cart' },
    { key: 'F4', action: 'Hold sale' },
    { key: 'F8', action: 'Resume held sale' },
    { key: 'F9', action: 'Pay' },
    { key: 'Esc', action: 'Cancel / Close' },
    { key: 'Ctrl+L', action: 'Logout' },
    { key: 'Ctrl+F', action: 'Search products' },
    { key: '?', action: 'Show shortcuts' },
  ],
  products: [
    { key: '← → ↑ ↓', action: 'Navigate products' },
    { key: 'Enter', action: 'Add to cart' },
    { key: 'Tab', action: 'Toggle Retail/Wholesale' },
    { key: '1-9', action: 'Add with quantity' },
    { key: 'Home/End', action: 'First/Last product' },
  ],
  cart: [
    { key: '↑ ↓', action: 'Navigate items' },
    { key: '+', action: 'Increase quantity' },
    { key: '-', action: 'Decrease quantity' },
    { key: 'Delete', action: 'Remove item' },
    { key: 'Ctrl+Del', action: 'Clear cart' },
    { key: 'Enter', action: 'Edit quantity' },
  ],
  payment: [
    { key: 'F9', action: 'Open payment' },
    { key: 'Enter', action: 'Confirm payment' },
    { key: 'Ctrl+P', action: 'Print receipt' },
    { key: 'Ctrl+R', action: 'Return' },
    { key: 'Ctrl+E', action: 'Exchange' },
    { key: 'Ctrl+D', action: 'Damage' },
  ],
};
