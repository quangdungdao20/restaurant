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
import { useRouter } from "next/navigation";
import { useState } from "react";

const formSchema = z.object({
  email: z.string().email({
    message: "Vui lòng nhập địa chỉ email hợp lệ.",
  }),
  password: z.string().min(8, {
    message: "Mật khẩu phải có ít nhất 8 ký tự.",
  }),
});

const SignInForm = () => {
  const supabase = createClient();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
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
        console.log("Sign in error:", error);
        setError(error.message);
        return;
      }

      if (data.user) {
        // Get user profile to check role and status
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          console.log("Profile fetch error:", profileError);
          setError("Không thể tải thông tin tài khoản");
          return;
        }

        // Check if user is Owner or Admin
        if (!["Owner", "Admin"].includes(profile.role)) {
          await supabase.auth.signOut();
          setError("Truy cập bị từ chối. Chỉ dành cho Chủ cửa hàng / Quản trị viên.");
          return;
        }

        // Check if user is active
        if (profile.status !== "Active") {
          await supabase.auth.signOut();
          setError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.");
          return;
        }

        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      console.error("Error signing in:", error);
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
                  placeholder="admin@coffeeshop.com"
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
          className="w-full bg-amber-600 hover:bg-amber-700 mt-6 cursor-pointer"
        >
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </div>
    </Form>
  );
};

export default SignInForm;
