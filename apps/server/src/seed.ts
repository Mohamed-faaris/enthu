import { eq } from "drizzle-orm";
import { auth } from "@enthu/auth";
import { createDb } from "@enthu/db";
import { user as userTable } from "@enthu/db/schema/auth";

const PASSWORD = "password123";
const db = createDb();

const seedUsers = [
  { name: "System Admin", email: "admin@enthu.local", role: "admin" },
  { name: "School SPOC", email: "spoc@enthu.local", role: "school_spoc" },
  { name: "Certificate Writer", email: "certwriter@enthu.local", role: "certificate_writer" },
  { name: "Event Coordinator", email: "coordinator@enthu.local", role: "event_coordinator" },
  { name: "Result Announcer", email: "announcer@enthu.local", role: "result_announcer" },
] as const;

async function main() {
  console.log("Seeding users via auth API...");

  for (const u of seedUsers) {
    try {
      await auth.api.signUpEmail({
        body: { name: u.name, email: u.email, password: PASSWORD },
      });

      await db
        .update(userTable)
        .set({ role: u.role })
        .where(eq(userTable.email, u.email));

      console.log(`  Created ${u.role}: ${u.email} / ${PASSWORD}`);
    } catch (e: any) {
      console.error(`  Failed: ${u.email} — ${e.message}`);
    }
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
