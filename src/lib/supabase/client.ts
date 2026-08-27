"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnvironment } from "@/lib/env/public";
import type { Database } from "@/types/database";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnvironment();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

