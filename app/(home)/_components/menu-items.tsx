"use client";

import { AnimatePresence } from "framer-motion";
import { ProductWithInventory } from "@/types/product.types";
import { Button } from "@/components/ui/button";
import ProductCard from "./product-card";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 15;

interface MenuItemsProps {
  data: ProductWithInventory[] | undefined;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  defaultNote?: string;
  onItemAdded?: () => void;
}

const MenuItems = ({
  data,
  currentPage,
  setCurrentPage,
  defaultNote,
  onItemAdded,
}: MenuItemsProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 text-center text-sm py-8">
        <p>Không tìm thấy món nào.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const startIndex = currentPage * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const currentData = data.slice(startIndex, endIndex);

  const goToPreviousPage = () => setCurrentPage(Math.max(0, currentPage - 1));
  const goToNextPage = () =>
    setCurrentPage(Math.min(totalPages - 1, currentPage + 1));

  return (
    <div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4">
        <AnimatePresence mode="popLayout">
          {currentData.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              defaultNote={defaultNote}
              onItemAdded={onItemAdded}
            />
          ))}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 0}
            className="flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === totalPages - 1}
            className="flex items-center gap-1 cursor-pointer"
          >
            Tiếp theo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default MenuItems;
