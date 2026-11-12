"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { Products } from "@/types/product.types";
import { getCategoryVariant, formatVND } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import ActionsDropdown, { ActionItem } from "@/components/actions-dropdown";
import AddProductModal from "@/components/modals/products/add-product-modal";
import EditProductModal from "@/components/modals/products/edit-product-modal";
import DeleteProductModal from "@/components/modals/products/delete-product-modal";
import BulkDeleteProductsModal from "@/components/modals/products/bulk-delete-products-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit2, Trash2, Plus, Eye } from "lucide-react";
import DataTableFilter from "@/components/data-table-filter";
import { useProducts } from "@/hooks/useProducts";
import ViewProductDetailsModal from "@/components/modals/products/view-product-details-modal";
import { useActivityLogger } from "@/hooks/useActivityLogger";

const ProductTable = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Products | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: products, isLoading, error } = useProducts();
  const { log } = useActivityLogger();

  const [filters, setFilters] = useState<{
    categories: string[];
  }>({
    categories: [],
  });

  const handleEdit = (product: Products) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleDelete = (product: Products) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleView = async (product: Products) => {
    setSelectedProduct(product);
    setIsViewModalOpen(true);

    await log({
      action: "view",
      subject: "product",
      entityId: product.id,
      entityName: product.name,
    });
  };

  const filteredData = useMemo(() => {
    if (!products) return [];

    let filtered = [...products];

    if (filters.categories.length > 0) {
      filtered = filtered.filter((item) =>
        filters.categories.includes(item.category),
      );
    }

    return filtered;
  }, [products, filters]);

  const selectedProducts = useMemo(
    () => filteredData.filter((p) => selectedIds.includes(p.id)),
    [filteredData, selectedIds],
  );

  const allSelected =
    filteredData.length > 0 &&
    filteredData.every((p) => selectedIds.includes(p.id));

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredData.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id),
    );
  };

  const columns: ColumnDef<Products>[] = [
    {
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => toggleAll(Boolean(checked))}
          aria-label="Chọn tất cả"
          className="cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={(checked) =>
            toggleOne(row.original.id, Boolean(checked))
          }
          aria-label={`Chọn ${row.original.name}`}
          className="cursor-pointer"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "image",
      header: "Hình ảnh",
      size: 80,
      cell: ({ row }) =>
        row.original.image ? (
          <Image
            src={row.original.image?.url ?? ""}
            alt={row.original.name}
            className="w-14 h-14 rounded-lg object-cover"
            width={56}
            height={56}
            priority
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center">
            <span className="text-xs text-gray-500">Không có ảnh</span>
          </div>
        ),
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "Tên sản phẩm",
      size: 200,
      cell: ({ row }) => (
        <div className="font-normal text-sm">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "price",
      header: "Giá",
      size: 120,
      cell: ({ row }) => (
        <div className="font-normal text-sm">
          {formatVND(row.original.price)}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Danh mục",
      size: 150,
      cell: ({ row }) => {
        const category = row.original.category;
        return (
          <Badge className={`rounded-full ${getCategoryVariant(category)}`}>
            {category}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      size: 60,
      cell: ({ row }) => {
        const actions: ActionItem[] = [
          {
            label: "Xem",
            icon: Eye,
            onClick: () => handleView(row.original),
          },
          {
            label: "Chỉnh sửa",
            icon: Edit2,
            onClick: () => handleEdit(row.original),
          },
          {
            label: "Xóa",
            icon: Trash2,
            onClick: () => handleDelete(row.original),
            variant: "destructive",
          },
        ];

        return <ActionsDropdown actions={actions} />;
      },
      enableSorting: false,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredData}
        filterComponent={
          <DataTableFilter
            filterType="product"
            onFilterChange={(f) =>
              setFilters({
                categories: f.categories ?? [],
              })
            }
          />
        }
        headerActions={
          <div className="flex items-center gap-2">
            {selectedProducts.length > 0 && (
              <Button
                variant="destructive"
                className="gap-2 cursor-pointer"
                onClick={() => setIsBulkDeleteModalOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                Xóa đã chọn ({selectedProducts.length})
              </Button>
            )}
            <Button
              className="gap-2 cursor-pointer"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Thêm sản phẩm
            </Button>
          </div>
        }
        emptyMessage="Không tìm thấy sản phẩm nào."
        searchPlaceholder="Tìm kiếm sản phẩm"
        isLoading={isLoading}
        loadingText="Đang tải sản phẩm..."
        error={error}
        errorText="Lỗi khi tải sản phẩm"
      />

      <AddProductModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <EditProductModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        product={selectedProduct}
      />
      <DeleteProductModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        product={selectedProduct}
      />
      <BulkDeleteProductsModal
        open={isBulkDeleteModalOpen}
        onOpenChange={setIsBulkDeleteModalOpen}
        products={selectedProducts}
        onSuccess={() => setSelectedIds([])}
      />
      <ViewProductDetailsModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        product={selectedProduct}
      />
    </>
  );
};

export default ProductTable;
