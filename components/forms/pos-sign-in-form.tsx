"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const formSchema = z.object({
  email: z.string().email({ message: "Vui lòng nhập địa chỉ email hợp lệ." }),
  password: z
    .string()
    .min(8, { message: "Mật khẩu phải có ít nhất 8 ký tự." }),
});

interface POSSignInFormProps {
  onSuccess: (user: { name: string; role: string }) => void;
}

const POSSignInForm = ({ onSuccess }: POSSignInFormProps) => {
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setError("Email hoặc mật khẩu không đúng.");
        return;
      }

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, last_name, role, status")
          .eq("id", data.user.id)
          .single();

        if (profileError || !profile) {
          setError("Không thể tải thông tin người dùng.");
          return;
        }

        if (profile.status !== "Active") {
          await supabase.auth.signOut();
          setError("Tài khoản của bạn không hoạt động. Vui lòng liên hệ quản trị viên.");
          return;
        }

        onSuccess({
          name: `${profile.first_name} ${profile.last_name}`,
          role: profile.role,
        });
      }
    } catch {
      setError("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.");
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Địa chỉ Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="staff@coffeeshop.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Nhập mật khẩu của bạn"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="button"
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="w-full bg-amber-600 hover:bg-amber-700 mt-2"
        >
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập POS"}
        </Button>
      </div>
    </Form>
  );
};

export default POSSignInForm;
