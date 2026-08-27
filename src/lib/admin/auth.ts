import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/types/domain";

export type AdminProfile = Readonly<{
  id: string;
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
}>;

export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("id,user_id,name,email,role,is_active")
    .eq("user_id", authData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (profileError || !profile) return null;
  return {
    id: profile.id,
    userId: profile.user_id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
  };
}

export async function requireFinanceAdmin(): Promise<AdminProfile> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role === "gate_staff") redirect("/admin/unauthorized");
  return admin;
}

export async function requireSuperAdmin(): Promise<AdminProfile> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "super_admin") redirect("/admin/unauthorized");
  return admin;
}

export async function requireGateAdmin(): Promise<AdminProfile> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login?next=/check-in");
  if (admin.role === "payment_admin") redirect("/admin/unauthorized");
  return admin;
}
