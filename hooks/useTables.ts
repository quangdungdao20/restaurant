import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TableItem } from "@/store/table";
import { toast } from "sonner";

export const useTables = () => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .order("table_number", { ascending: true });
      if (error) {
        // Gracefully fall back to default tables if the tables migration hasn't been run yet
        return [] as TableItem[];
      }
      return (data ?? []) as TableItem[];
    },
  });
};

export const useCreateTable = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      business_id: string;
      table_number: number;
      capacity: number;
      status?: "available" | "occupied" | "reserved";
    }) => {
      const { data, error } = await supabase
        .from("tables")
        .insert({
          business_id: input.business_id,
          table_number: input.table_number,
          capacity: input.capacity,
          status: input.status ?? "available",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Thêm bàn thành công!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Không thể thêm bàn. Vui lòng kiểm tra lại.");
    },
  });
};

export const useUpdateTableStatus = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: "available" | "occupied" | "reserved";
      capacity?: number;
    }) => {
      const updateData: {
        status: "available" | "occupied" | "reserved";
        capacity?: number;
      } = { status: input.status };
      if (input.capacity !== undefined) updateData.capacity = input.capacity;

      const { data, error } = await supabase
        .from("tables")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Cập nhật trạng thái bàn thành công!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Không thể cập nhật bàn.");
    },
  });
};

export const useDeleteTable = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Đã xóa bàn!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Không thể xóa bàn.");
    },
  });
};
