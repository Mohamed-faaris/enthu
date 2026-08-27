import { eq } from "drizzle-orm";
import { createDb } from "@enthu/db";
import { categories, events } from "@enthu/db/schema";

const db = createDb();

const categoryData = [
  { name: "Category 1", minClass: 6, maxClass: 8 },
  { name: "Category 2", minClass: 9, maxClass: 10 },
  { name: "Category 3", minClass: 11, maxClass: 12 },
  { name: "Category 4", minClass: 9, maxClass: 12 },
  { name: "Category 5", minClass: 6, maxClass: 12 },
  { name: "Spot Event", minClass: 6, maxClass: 12 },
  { name: "Fun Event", minClass: 6, maxClass: 12 },
];

const eventData = [
  { category: "Category 1", name: "Pencil Sketching", gender: "mixed", eventType: "individual", teamMin: 1, teamMax: 1, maxEntries: 10, scoringType: "points" },
  { category: "Category 1", name: "Hand Craft", gender: "mixed", eventType: "team", teamMin: 2, teamMax: 2, maxEntries: 5, scoringType: "points" },
  { category: "Category 2", name: "Collage", gender: "mixed", eventType: "team", teamMin: 2, teamMax: 2, maxEntries: 5, scoringType: "points" },
  { category: "Category 2", name: "Elocution in English", gender: "mixed", eventType: "individual", teamMin: 1, teamMax: 1, maxEntries: 2, scoringType: "judged" },
  { category: "Category 2", name: "Adapt Tune", gender: "mixed", eventType: "individual", teamMin: 1, teamMax: 1, maxEntries: 5, scoringType: "judged" },
  { category: "Category 3", name: "Kolam", gender: "mixed", eventType: "team", teamMin: 2, teamMax: 2, maxEntries: 3, scoringType: "judged" },
  { category: "Category 3", name: "Paint without Brush - Tri Hues", gender: "mixed", eventType: "individual", teamMin: 1, teamMax: 1, maxEntries: 3, scoringType: "judged" },
  { category: "Category 3", name: "Tamil Turn Coat", gender: "mixed", eventType: "individual", teamMin: 1, teamMax: 1, maxEntries: 3, scoringType: "judged" },
  { category: "Category 3", name: "Mr. & Ms. Enthusia '26", gender: "mixed", eventType: "individual", teamMin: 1, teamMax: 1, maxEntries: 2, scoringType: "judged" },
  { category: "Category 4", name: "Non Classical Dance - Solo", gender: "mixed", eventType: "individual", teamMin: 1, teamMax: 1, maxEntries: 3, scoringType: "judged" },
  { category: "Category 4", name: "Paper Dress Designing", gender: "mixed", eventType: "team", teamMin: 4, teamMax: 4, maxEntries: 1, scoringType: "judged" },
  { category: "Category 4", name: "Group Singing", gender: "mixed", eventType: "team", teamMin: 5, teamMax: 5, maxEntries: 1, scoringType: "judged" },
  { category: "Category 4", name: "Quiz", gender: "mixed", eventType: "team", teamMin: 4, teamMax: 4, maxEntries: 1, scoringType: "points" },
  { category: "Category 5", name: "Classical Dance - Dual / Trio", gender: "mixed", eventType: "team", teamMin: 2, teamMax: 3, maxEntries: 1, scoringType: "judged" },
  { category: "Category 5", name: "Western Dance - Group", gender: "mixed", eventType: "team", teamMin: 6, teamMax: 10, maxEntries: 1, scoringType: "judged" },
  { category: "Category 5", name: "Indian Traditional Folk Dance - Group", gender: "mixed", eventType: "team", teamMin: 6, teamMax: 10, maxEntries: 1, scoringType: "judged" },
  { category: "Category 5", name: "Cine Folk Dance - Group / Free Style / Fusion", gender: "mixed", eventType: "team", teamMin: 6, teamMax: 10, maxEntries: 1, scoringType: "judged" },
  { category: "Category 5", name: "Cinematic Recreation", gender: "mixed", eventType: "team", teamMin: null, teamMax: 12, maxEntries: 1, scoringType: "judged" },
  { category: "Category 5", name: "Mime", gender: "mixed", eventType: "team", teamMin: 6, teamMax: 6, maxEntries: 1, scoringType: "judged" },
  { category: "Category 5", name: "Mono Acting", gender: "mixed", eventType: "individual", teamMin: 1, teamMax: 1, maxEntries: 2, scoringType: "judged" },
  { category: "Category 5", name: "Reels", gender: "mixed", eventType: "individual", teamMin: null, teamMax: null, maxEntries: 5, scoringType: "judged" },
  { category: "Category 5", name: "Poster Recreation", gender: "mixed", eventType: "individual", teamMin: null, teamMax: null, maxEntries: null, scoringType: "judged" },
  { category: "Spot Event", name: "Minute to Fame", gender: "mixed", eventType: "individual", teamMin: 1, teamMax: 1, maxEntries: null, scoringType: "judged" },
  { category: "Spot Event", name: "Treasure Hunt", gender: "mixed", eventType: "team", teamMin: 5, teamMax: 5, maxEntries: 1, scoringType: "points" },
  { category: "Fun Event", name: "RC Race", gender: "mixed", eventType: "individual", teamMin: null, teamMax: null, maxEntries: null, scoringType: "points" },
  { category: "Fun Event", name: "String Hockey", gender: "mixed", eventType: "individual", teamMin: null, teamMax: null, maxEntries: null, scoringType: "points" },
  { category: "Fun Event", name: "Running Race", gender: "mixed", eventType: "individual", teamMin: null, teamMax: null, maxEntries: null, scoringType: "points" },
  { category: "Fun Event", name: "Balloon Shooter", gender: "mixed", eventType: "individual", teamMin: null, teamMax: null, maxEntries: null, scoringType: "points" },
  { category: "Fun Event", name: "Ring Pointer", gender: "mixed", eventType: "individual", teamMin: null, teamMax: null, maxEntries: null, scoringType: "points" },
];

async function main() {
  console.log("Seeding categories...");

  const categoryMap = new Map<string, string>();

  for (const c of categoryData) {
    const existing = await db.select().from(categories).where(eq(categories.name, c.name)).limit(1);
    if (existing.length > 0) {
      categoryMap.set(c.name, existing[0].id);
      console.log(`  Exists: ${c.name}`);
      continue;
    }
    const [inserted] = await db.insert(categories).values({ name: c.name, minClass: c.minClass, maxClass: c.maxClass }).returning();
    categoryMap.set(c.name, inserted.id);
    console.log(`  Created: ${c.name} (classes ${c.minClass}-${c.maxClass})`);
  }

  console.log("\nSeeding events...");

  for (const e of eventData) {
    const existing = await db.select().from(events).where(eq(events.name, e.name)).limit(1);
    if (existing.length > 0) {
      console.log(`  Exists: ${e.name}`);
      continue;
    }

    const categoryId = categoryMap.get(e.category);
    if (!categoryId) {
      console.error(`  Category not found: ${e.category}`);
      continue;
    }

    await db.insert(events).values({
      categoryId,
      name: e.name,
      gender: e.gender as any,
      eventType: e.eventType as any,
      scoringType: e.scoringType as any,
      teamMinMembers: e.teamMin,
      teamMaxMembers: e.teamMax,
      maxTeamsPerSchool: e.maxEntries,
    });

    console.log(`  Created: ${e.name}`);
  }

  console.log("\nSeed complete.");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
