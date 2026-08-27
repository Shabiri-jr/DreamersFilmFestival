type PublicEnvironment = Readonly<{
  supabaseUrl: string;
  supabaseAnonKey: string;
}>;

function requirePublicValue(
  name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  value: string | undefined,
): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and add your Supabase project value.`,
    );
  }

  return value;
}

export function getPublicEnvironment(): PublicEnvironment {
  return {
    supabaseUrl: requirePublicValue(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    supabaseAnonKey: requirePublicValue(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

