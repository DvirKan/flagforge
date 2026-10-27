import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimal RPC port so the persisted-game service runs against Supabase (prod) or plain pg (tests). */
export interface GameRpc {
  call<T>(fn: string, args: Record<string, unknown>): Promise<T>;
}

export class RpcError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

export function supabaseRpc(client: SupabaseClient): GameRpc {
  return {
    async call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
      const { data, error } = await client.rpc(fn, args);
      if (error) throw new RpcError(error.message, error.code);
      return data as T;
    },
  };
}
