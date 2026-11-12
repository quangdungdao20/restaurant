
"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useProducts } from "@/hooks/useProducts";
import { ProductWithInventory } from "@/types/product.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, StickyNote, X } from "lucide-react";
import ReusableImage from "@/components/reusable-image";
import { formatVND } from "@/lib/utils";
import { useTableStore } from "@/store/table";
import { useOrderStore } from "@/store/order";

interface MenuProps {
  posUser: { name: string; role: string };
  onSignOut: () => void;
  onBackToTables: () => void;
  className?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const Menu = ({ posUser, onBackToTables, className }: MenuProps) => {
  const { selectedTable } = useTableStore();
  const { addItem } = useOrderStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [itemNote, setItemNote] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading, error } = useProducts();

  const searchResults = useMemo(() => {
    if (!products) return [];

    const query = searchQuery.trim().toLowerCase();

    return (products as ProductWithInventory[])
      .filter((product) =>
        !query || product.name.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [products, searchQuery]);

  // Tính vị trí dropdown theo input
  const updatePosition = useCallback(() => {
    if (!searchRef.current) return;

    const rect = searchRef.current.getBoundingClientRect();

    const gap = 6;
    const padding = 8;
    const maxDropdownHeight = 300;

    const availableBelow = window.innerHeight - rect.bottom - gap - padding;
    const availableAbove = rect.top - gap - padding;

    const openAbove =
      availableBelow < 180 && availableAbove > availableBelow;

    const maxHeight = Math.max(
      120,
      Math.min(
        maxDropdownHeight,
        openAbove ? availableAbove : availableBelow
      )
    );

    setPosition({
      top: openAbove
        ? Math.max(padding, rect.top - gap - maxHeight)
        : rect.bottom + gap,
      left: Math.max(
        padding,
        Math.min(rect.left, window.innerWidth - rect.width - padding)
      ),
      width: Math.min(rect.width, window.innerWidth - padding * 2),
      maxHeight,
    });
  }, []);

  // Theo dõi vị trí khi scroll hoặc resize
  useEffect(() => {
    if (!isSearchOpen) return;

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isSearchOpen, updatePosition]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    if (!isSearchOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        !searchRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsSearchOpen(false);
        setIsNoteOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchOpen]);

  const handleAddItem = (product: ProductWithInventory) => {
    addItem(product, 9999, itemNote);
    setSearchQuery("");
    setItemNote("");
    setIsSearchOpen(false);
    setIsNoteOpen(false);
  };

  const handleCloseSearch = () => {
    setSearchQuery("");
    setItemNote("");
    setIsSearchOpen(false);
    setIsNoteOpen(false);
    inputRef.current?.blur();
  };

  if (isLoading || error) {
    return (
      <div className="col-span-12 lg:col-span-8 xl:col-span-9 bg-white rounded-lg shadow-sm h-full p-4 flex items-center justify-center">
        <span className={`text-xs ${error ? "text-red-500" : "text-gray-500"}`}>
          {error
            ? "Lỗi khi tải danh sách món. Vui lòng thử lại."
            : "Đang tải danh sách món..."}
        </span>
      </div>
    );
  }

  return (
    <div
      className={
        className ??
        "col-span-12 lg:col-span-8 xl:col-span-9 bg-white rounded-lg shadow-sm h-full p-3 space-y-3"
      }
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1 text-xs text-gray-600"
          onClick={onBackToTables}
        >
          <ArrowLeft className="h-4 w-4" />
          Bàn
        </Button>

        <div className="h-5 w-px bg-gray-200" />

        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800">
            {selectedTable
              ? `Bàn ${selectedTable.table_number}`
              : "Khách mang về"}
          </p>
          <p className="text-[10px] text-gray-400">
            {posUser.name}
          </p>
        </div>
      </div>

      {/* Search input */}
      <div className="relative" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

        <Input
          ref={inputRef}
          type="text"
          placeholder="Tìm món..."
          value={searchQuery}
          onFocus={() => {
            setIsSearchOpen(true);
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchOpen(true);
          }}
          className="h-10 pl-9 pr-9 text-sm rounded-lg bg-gray-50 border-gray-200 focus:bg-white"
        />

        {/* X nằm bên trong input */}
        {isSearchOpen && (
          <button
            type="button"
            aria-label="Đóng tìm kiếm"
            onClick={handleCloseSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Floating dropdown */}
      {isSearchOpen &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            className="z-[9999] flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_12px_35px_rgba(0,0,0,0.16)] animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {/* Results */}
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 shrink-0">
              <span className="text-[11px] font-medium text-gray-500">
                {searchQuery.trim() ? "Kết quả tìm kiếm" : "Gợi ý món"}
              </span>

              <span className="text-[10px] text-gray-400">
                {searchResults.length} món
              </span>
            </div>

            {/* Product list */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
              {searchResults.length > 0 ? (
                <div className="space-y-0.5">
                  {searchResults.map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => handleAddItem(product)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-gray-50 active:bg-amber-50 transition-colors"
                    >
                      <ReusableImage
                        src={product.image?.url || ""}
                        alt={product.name}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        fallbackText={product.name}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-gray-800">
                          {product.name}
                        </p>

                        <p className="mt-0.5 text-[11px] font-semibold text-amber-600">
                          {formatVND(product.price)}
                        </p>
                      </div>

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-amber-600">
                        <span className="text-lg leading-none">+</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-7 text-center">
                  <Search className="mx-auto mb-2 h-5 w-5 text-gray-300" />
                  <p className="text-xs text-gray-500">
                    Không tìm thấy món phù hợp.
                  </p>
                </div>
              )}
            </div>

            {/* Optional note */}
            <div className="shrink-0 border-t border-gray-100 bg-gray-50">
              {isNoteOpen ? (
                <div className="flex items-center gap-2 p-2">
                  <StickyNote className="h-4 w-4 shrink-0 text-gray-400" />

                  <Input
                    autoFocus
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    placeholder="Ít đá, không đường..."
                    className="h-8 bg-white text-xs"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setIsNoteOpen(false);
                      setItemNote("");
                    }}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsNoteOpen(true)}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-[11px] text-gray-500 hover:text-gray-800"
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  Thêm ghi chú cho món
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Menu;
