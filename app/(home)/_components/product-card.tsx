"use client";

import { motion } from "framer-motion";
import { ProductWithInventory } from "@/types/product.types";
import { Button } from "@/components/ui/button";
import ReusableImage from "@/components/reusable-image";
import { useOrderStore } from "@/store/order";
import { formatVND } from "@/lib/utils";

interface ProductCardProps {
  product: ProductWithInventory;
  defaultNote?: string;
  onItemAdded?: () => void;
}

const ProductCard = ({
  product,
  defaultNote,
  onItemAdded,
}: ProductCardProps) => {
  const addItem = useOrderStore((state) => state.addItem);

  const handleAddToOrder = () => {
    addItem(product, 9999, defaultNote);
    onItemAdded?.();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" as const }}
      className="p-2 flex flex-col gap-1.5 bg-white border rounded-lg"
    >
      <div className="relative">
        <ReusableImage
          src={product.image?.url || ""}
          alt={product.name}
          className="w-full aspect-[3/2] object-cover rounded"
          fallbackText={product.name}
          priority
        />
      </div>
      <div className="text-sm font-medium line-clamp-1">{product.name}</div>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-gray-900">
          {formatVND(product.price)}
        </div>
        <Button
          size="sm"
          onClick={handleAddToOrder}
          className="cursor-pointer"
        >
          Thêm
        </Button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
