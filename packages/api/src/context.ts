import { auth } from "@enthu/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  // better-auth forwards extra user fields (role, schoolId) if configured via additionalFields
  const user = session?.user as
    | (typeof session extends null ? null : NonNullable<typeof session>["user"] & {
        role?: string;
        schoolId?: string | null;
      })
    | undefined;
  return {
    session,
    user: user ?? null,
    headers: context.req.raw.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
