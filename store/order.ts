import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Products } from "@/types/product.types";

export interface OrderItem extends Products {
  quantity: number;
  maxQuantity: number;
  note?: string;
}

interface PromoState {
  promoCode: string | null;
  discountType: "percentage" | "fixed" | null;
  discountValue: number;
  discountAmount: number;
}

export interface TableOrderData {
  items: OrderItem[];
  promo: PromoState;
  tableNote?: string;
  isOrdered?: boolean;
  orderedAt?: string;
}

interface OrderStore {
  activeTableKey: string;
  ordersByTable: Record<string, TableOrderData>;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  promo: PromoState;
  tableNote: string;
  isOrdered: boolean;
  setActiveTable: (tableKey: string) => void;
  addItem: (product: Products, maxQuantity: number, note?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItemNote: (id: string, note: string) => void;
  setTableNote: (note: string) => void;
  confirmOrder: () => void;
  payPartialItems: (paidItems: { id: string; quantity: number }[]) => void;
  applyPromo: (
    code: string,
    type: "percentage" | "fixed",
    value: number,
  ) => void;
  removePromo: () => void;
  setDiscountPercentage: (percentage: number) => void;
  clearOrder: () => void;
}

const TAX_RATE = 0; // Đã bỏ thuế

const EMPTY_PROMO: PromoState = {
  promoCode: null,
  discountType: null,
  discountValue: 0,
  discountAmount: 0,
};

export const calculateOrderTotals = (
  items: OrderItem[],
  discountAmount = 0,
) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discounted = Math.max(0, subtotal - discountAmount);
  const tax = discounted * TAX_RATE;
  const total = discounted + tax;
  return { subtotal, tax, total };
};

const calculateDiscount = (
  subtotal: number,
  type: "percentage" | "fixed",
  value: number,
): number => {
  if (type === "percentage")
    return Math.round(((subtotal * value) / 100) * 100) / 100;
  return Math.min(value, subtotal);
};

const syncTableState = (
  ordersByTable: Record<string, TableOrderData>,
  tableKey: string,
  items: OrderItem[],
  promo: PromoState,
  tableNote: string,
  isOrdered: boolean,
  orderedAt?: string,
) => {
  const rawSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const newDiscountAmount = promo.discountType === "percentage" &&
    promo.discountValue > 0
    ? calculateDiscount(rawSubtotal, promo.discountType!, promo.discountValue)
    : 0;
  const updatedPromo = { ...promo, discountAmount: newDiscountAmount };
  const totals = calculateOrderTotals(items, newDiscountAmount);

  const nextOrdersByTable = { ...ordersByTable };
  if (items.length === 0 && !tableNote.trim()) {
    delete nextOrdersByTable[tableKey];
  } else {
    nextOrdersByTable[tableKey] = {
      items,
      promo: updatedPromo,
      tableNote,
      isOrdered: items.length > 0 ? isOrdered : false,
      orderedAt: items.length > 0 && isOrdered
        ? orderedAt ?? ordersByTable[tableKey]?.orderedAt
        : undefined,
    };
  }

  return {
    ordersByTable: nextOrdersByTable,
    items,
    ...totals,
    promo: updatedPromo,
    tableNote,
    isOrdered: items.length > 0 ? isOrdered : false,
  };
};

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      activeTableKey: "no-table",
      ordersByTable: {},
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      promo: EMPTY_PROMO,
      tableNote: "",
      isOrdered: false,

      setActiveTable: (tableKey) => {
        const { ordersByTable } = get();
        const existing = ordersByTable[tableKey];
        const items = existing?.items ?? [];
        const promo = existing?.promo ?? EMPTY_PROMO;
        const tableNote = existing?.tableNote ?? "";
        const isOrdered = existing?.isOrdered ?? false;
        const totals = calculateOrderTotals(items, promo.discountAmount);
        set({
          activeTableKey: tableKey,
          items,
          ...totals,
          promo,
          tableNote,
          isOrdered,
        });
      },

      addItem: (product, maxQuantity, note) => {
        const {
          items,
          promo,
          tableNote,
          isOrdered,
          ordersByTable,
          activeTableKey,
        } = get();
        const existing = items.find((i) => i.id === product.id);
        const trimmedNote = note?.trim();

        let newItems: OrderItem[];
        if (existing) {
          if (existing.quantity >= maxQuantity) return;
          newItems = items.map((i) =>
            i.id === product.id
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  note: trimmedNote
                    ? i.note
                      ? `${i.note}; ${trimmedNote}`
                      : trimmedNote
                    : i.note,
                }
              : i,
          );
        } else {
          if (maxQuantity <= 0) return;
          newItems = [
            ...items,
            {
              ...product,
              quantity: 1,
              maxQuantity,
              note: trimmedNote || undefined,
            },
          ];
        }

        set(
          syncTableState(
            ordersByTable,
            activeTableKey,
            newItems,
            promo,
            tableNote,
            isOrdered,
          ),
        );
      },

      removeItem: (id) => {
        const {
          items,
          promo,
          tableNote,
          isOrdered,
          ordersByTable,
          activeTableKey,
        } = get();
        const newItems = items.filter((i) => i.id !== id);
        set(
          syncTableState(
            ordersByTable,
            activeTableKey,
            newItems,
            promo,
            tableNote,
            isOrdered,
          ),
        );
      },

      updateQuantity: (id, quantity) => {
        const {
          items,
          promo,
          tableNote,
          isOrdered,
          ordersByTable,
          activeTableKey,
        } = get();

        let newItems: OrderItem[];
        if (quantity <= 0) {
          newItems = items.filter((i) => i.id !== id);
        } else {
          const item = items.find((i) => i.id === id);
          if (!item) return;
          const clamped = Math.min(quantity, item.maxQuantity);
          newItems = items.map((i) =>
            i.id === id ? { ...i, quantity: clamped } : i,
          );
        }

        set(
          syncTableState(
            ordersByTable,
            activeTableKey,
            newItems,
            promo,
            tableNote,
            isOrdered,
          ),
        );
      },

      updateItemNote: (id, note) => {
        const {
          items,
          promo,
          tableNote,
          isOrdered,
          ordersByTable,
          activeTableKey,
        } = get();
        const newItems = items.map((i) =>
          i.id === id ? { ...i, note: note || undefined } : i,
        );
        set(
          syncTableState(
            ordersByTable,
            activeTableKey,
            newItems,
            promo,
            tableNote,
            isOrdered,
          ),
        );
      },

      setTableNote: (note) => {
        const { items, promo, isOrdered, ordersByTable, activeTableKey } =
          get();
        set(
          syncTableState(
            ordersByTable,
            activeTableKey,
            items,
            promo,
            note,
            isOrdered,
          ),
        );
      },

      confirmOrder: () => {
        const { items, promo, tableNote, ordersByTable, activeTableKey } =
          get();
        if (items.length === 0) return;
        set(
          syncTableState(
            ordersByTable,
            activeTableKey,
            items,
            promo,
            tableNote,
            true,
            new Date().toISOString(),
          ),
        );
      },

      payPartialItems: (paidItems) => {
        const { items, tableNote, ordersByTable, activeTableKey } =
          get();
        const paidMap = new Map(paidItems.map((p) => [p.id, p.quantity]));
        const remainingItems = items
          .map((item) => {
            const paidQty = paidMap.get(item.id) ?? 0;
            if (paidQty <= 0) return item;
            const remainingQty = item.quantity - paidQty;
            return remainingQty > 0 ? { ...item, quantity: remainingQty } : null;
          })
          .filter((item): item is OrderItem => item !== null);

        if (remainingItems.length === 0) {
          const nextOrdersByTable = { ...ordersByTable };
          delete nextOrdersByTable[activeTableKey];
          set({
            ordersByTable: nextOrdersByTable,
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0,
            promo: EMPTY_PROMO,
            tableNote: "",
            isOrdered: false,
          });
        } else {
          set(
            syncTableState(
              ordersByTable,
              activeTableKey,
              remainingItems,
              EMPTY_PROMO,
              tableNote,
              true,
            ),
          );
        }
      },

      applyPromo: (code, type, value) => {
        const { items, tableNote, isOrdered, ordersByTable, activeTableKey } =
          get();
        const subtotal = items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0,
        );
        const discountAmount = calculateDiscount(subtotal, type, value);
        const newPromo: PromoState = {
          promoCode: code,
          discountType: type,
          discountValue: value,
          discountAmount,
        };
        set(
          syncTableState(
            ordersByTable,
            activeTableKey,
            items,
            newPromo,
            tableNote,
            isOrdered,
          ),
        );
      },

      setDiscountPercentage: (percentage) => {
        const { items, tableNote, isOrdered, ordersByTable, activeTableKey } =
          get();
        const value = Math.min(100, Math.max(0, Number.isFinite(percentage) ? percentage : 0));
        const newPromo: PromoState = value > 0
          ? {
              promoCode: null,
              discountType: "percentage",
              discountValue: value,
              discountAmount: 0,
            }
          : EMPTY_PROMO;
        set(
          syncTableState(
            ordersByTable,
            activeTableKey,
            items,
            newPromo,
            tableNote,
            isOrdered,
          ),
        );
      },

      removePromo: () => {
        const { items, tableNote, isOrdered, ordersByTable, activeTableKey } =
          get();
        set(
          syncTableState(
            ordersByTable,
            activeTableKey,
            items,
            EMPTY_PROMO,
            tableNote,
            isOrdered,
          ),
        );
      },

      clearOrder: () => {
        const { ordersByTable, activeTableKey } = get();
        const nextOrdersByTable = { ...ordersByTable };
        delete nextOrdersByTable[activeTableKey];
        set({
          ordersByTable: nextOrdersByTable,
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          promo: EMPTY_PROMO,
          tableNote: "",
          isOrdered: false,
        });
      },
    }),
    {
      name: "pos-table-orders",
    },
  ),
);
