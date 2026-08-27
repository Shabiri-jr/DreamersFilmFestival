import "server-only";

type ServerEnvironment = Readonly<{
  serviceRoleKey: string;
  appOrigin: string;
}>;

function requireServerValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}

export function getServerEnvironment(): ServerEnvironment {
  const appOrigin = requireServerValue("APP_ORIGIN", process.env.APP_ORIGIN);
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(appOrigin);
  } catch {
    throw new Error("APP_ORIGIN must be an absolute URL.");
  }
  const isLocalOrigin = ["localhost", "127.0.0.1"].includes(
    parsedOrigin.hostname,
  );
  if (
    parsedOrigin.origin !== appOrigin.replace(/\/$/, "") ||
    !["http:", "https:"].includes(parsedOrigin.protocol) ||
    (process.env.NODE_ENV === "production" &&
      parsedOrigin.protocol !== "https:" &&
      !isLocalOrigin)
  ) {
    throw new Error(
      "APP_ORIGIN must be the canonical origin and must use HTTPS in production.",
    );
  }

  return {
    serviceRoleKey: requireServerValue(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    appOrigin: parsedOrigin.origin,
  };
}

export function getReferralAttributionSecret(): string {
  return requireServerValue(
    "REFERRAL_ATTRIBUTION_SECRET",
    process.env.REFERRAL_ATTRIBUTION_SECRET,
  );
}

export function getOrderAccessSecret(): string {
  return requireServerValue(
    "ORDER_ACCESS_SECRET",
    process.env.ORDER_ACCESS_SECRET,
  );
}
