import "server-only";

import { headers } from "next/headers";

import { getServerEnvironment } from "@/lib/env/server";

export async function assertTrustedOrigin(): Promise<void> {
  const requestOrigin = (await headers()).get("origin");
  const configuredOrigin = new URL(getServerEnvironment().appOrigin).origin;

  if (!requestOrigin || new URL(requestOrigin).origin !== configuredOrigin) {
    throw new Error("This request could not be verified.");
  }
}

