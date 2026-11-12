import { Database } from "@/types/supabase";
import { Products } from "@/types/product.types";

export type Inventory = Database["public"]["Tables"]["inventory"]["Row"];

export type InventoryWithProduct = Inventory & {
  product: Products;
};
