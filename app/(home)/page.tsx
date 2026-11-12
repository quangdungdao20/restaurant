"use client";

import { useState, useEffect } from "react";
import Menu from "./_components/menu";
import OrderDetails from "./_components/order-details";
import TableSelector from "./_components/table-selector";
import POSSignInForm from "@/components/forms/pos-sign-in-form";
import AppLogo from "@/components/app-logo";
import AppName from "@/components/app-name";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface POSUser {
  name: string;
  role: string;
}

type AppState = "loading" | "login" | "table-select" | "pos";

const Home = () => {
  const [posUser, setPosUser] = useState<POSUser | null>(null);
  const [appState, setAppState] = useState<AppState>("loading");
  const router = useRouter();
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, role, status")
          .eq("id", user.id)
          .single();

        if (profile && profile.status === "Active") {
          setPosUser({
            name: `${profile.first_name} ${profile.last_name}`,
            role: profile.role,
          });
          setAppState("table-select");
          return;
        }
      }
      setAppState("login");
    };
    checkSession();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setPosUser(null);
    setAppState("login");
  };

  const handleLoginSuccess = (user: POSUser) => {
    setPosUser(user);
    setAppState("table-select");
  };

  const handleTableSelected = () => {
    setAppState("pos");
  };

  const handleBackToTableSelect = () => {
    router.push("/");
    setAppState("table-select");
  };

  if (appState === "loading") {
    return (
      <div className="container mx-auto grid grid-cols-12 gap-4 h-dvh p-4">
        <div className="col-span-full bg-white rounded-lg shadow-sm h-full flex items-center justify-center">
          <p className="text-gray-400 text-sm animate-pulse">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (appState === "login") {
    return (
      <div className="container mx-auto grid grid-cols-12 gap-4 h-dvh p-4">
        <div className="col-span-full bg-white rounded-lg shadow-sm h-full p-4 flex items-center justify-center">
          <div className="w-full max-w-md space-y-6">
            <div className="flex flex-col items-center">
              <AppLogo />
              <h1 className="text-2xl font-bold text-gray-900">
                Đăng nhập POS
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Đăng nhập vào <AppName /> POS
              </p>
            </div>
            <POSSignInForm onSuccess={handleLoginSuccess} />
          </div>
        </div>
      </div>
    );
  }

  if (appState === "table-select" && posUser) {
    return (
      <div className="container mx-auto grid grid-cols-12 gap-4 h-dvh p-2 sm:p-4">
        <TableSelector
          posUser={posUser}
          onSignOut={handleSignOut}
          onTableSelected={handleTableSelected}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto flex flex-col gap-2 h-dvh p-2 lg:p-4 overflow-hidden">
      <Menu
        posUser={posUser!}
        onSignOut={handleSignOut}
        onBackToTables={handleBackToTableSelect}
        className="shrink-0 max-h-[52dvh] overflow-y-auto rounded-lg bg-white p-3 shadow-sm lg:p-4"
      />
      <OrderDetails
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white p-3 shadow-sm lg:p-4"
      />
    </div>
  );
};

export default Home;
