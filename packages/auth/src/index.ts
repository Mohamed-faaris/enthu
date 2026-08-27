import { createDb } from "@enthu/db";
import * as schema from "@enthu/db/schema/auth";
import { env } from "@enthu/env/server";
import { admin } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export function createAuth() {
  const db = createDb();
  const isProd = env.NODE_ENV === "production";

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",

      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        schoolId: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        httpOnly: true,
      },
    },
    plugins: [admin({ adminRoles: ["admin"], defaultRole: "school_spoc" })],
  });
}

export const auth = createAuth();
