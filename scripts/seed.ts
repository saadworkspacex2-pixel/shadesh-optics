import "dotenv/config";
import crypto from "node:crypto";
import { db, pool } from "../src/db";
import { admins, settings } from "../src/db/schema";
import { eq, or } from "drizzle-orm";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const passwordHash = hashPassword("shadesh123");

  // Upsert both email variants so both work out of the box
  for (const email of ["admin@shadesh-optics.com", "admin@shadeshoptics.com"]) {
    const [existing] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
    if (existing) {
      await db.update(admins).set({ passwordHash, name: "SHADESH Manager" }).where(eq(admins.id, existing.id));
      console.log(`✓ updated existing admin: ${email}`);
    } else {
      await db.insert(admins).values({ email, passwordHash, name: "SHADESH Manager" });
      console.log(`✓ created admin: ${email}`);
    }
  }

  // Ensure settings are present
  const defaults = [
    { key: "delivery", value: { inside: 70, outside: 130 } },
    { key: "announcement", value: "Cash on Delivery available nationwide · 7-day easy returns · 1-year lens warranty" },
    { key: "branding", value: { logoUrl: "/images/brand-mark.png" } },
    {
      key: "social",
      value: {
        facebook: "https://facebook.com/shadeshoptics",
        messenger: "https://m.me/shadeshoptics",
        phone: "09612-345678",
        whatsapp: "8801712345678",
      },
    },
  ];

  for (const s of defaults) {
    await db
      .insert(settings)
      .values(s)
      .onConflictDoUpdate({ target: settings.key, set: { value: s.value } });
  }

  console.log("✓ settings verified");
  console.log("Credentials guaranteed: admin@shadesh-optics.com / shadesh123");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});

void or;
