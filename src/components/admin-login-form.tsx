"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAdmin, type AdminActionState } from "@/lib/admin/actions";

const initialState: AdminActionState = {};

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#e84b16] px-5 text-sm font-extrabold tracking-[0.08em] text-white uppercase transition-colors hover:bg-[#c93b0d] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#eaa42c] disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in securely"}
    </button>
  );
}

export function AdminLoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAdmin, initialState);
  return (
    <form action={action} className="mt-8 space-y-5">
      {next === "/check-in" && <input type="hidden" name="next" value="/check-in" />}
      <div>
        <label htmlFor="email" className="text-xs font-extrabold tracking-[0.12em] text-[#17120f]/60 uppercase">Staff email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="form-input mt-2" />
      </div>
      <div>
        <label htmlFor="password" className="text-xs font-extrabold tracking-[0.12em] text-[#17120f]/60 uppercase">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} className="form-input mt-2" />
      </div>
      {state.error && <p role="alert" className="rounded-xl border border-[#a91f14]/20 bg-[#a91f14]/8 p-3 text-sm font-bold text-[#8e1c13]">{state.error}</p>}
      <LoginButton />
    </form>
  );
}
