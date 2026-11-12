import { create } from "zustand";

export interface TableItem {
  id: string;
  table_number: number;
  capacity: number;
  status: "available" | "occupied" | "reserved";
}

interface TableStore {
  selectedTable: TableItem | null;
  selectTable: (table: TableItem) => void;
  clearTable: () => void;
}

export const useTableStore = create<TableStore>((set) => ({
  selectedTable: null,
  selectTable: (table) => set({ selectedTable: table }),
  clearTable: () => set({ selectedTable: null }),
}));
