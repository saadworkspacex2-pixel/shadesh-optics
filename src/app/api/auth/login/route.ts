import { NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setAdminCookie, verifyPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 8, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

    // 1. Try exact email match
    const found = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
    let admin: (typeof found)[number] | undefined = found[0];

    // 2. If not found, try flexible match (hyphen or no-hyphen: admin@shadesh-optics.com vs admin@shadeshoptics.com)
    if (!admin) {
      const cleanInput = email.replace(/[-_.\s]/g, "");
      const allAdmins = await db.select().from(admins);
      admin = allAdmins.find((a) => {
        const cleanDb = a.email.toLowerCase().trim().replace(/[-_.\s]/g, "");
        return cleanDb === cleanInput || (cleanInput === "admin" && cleanDb.startsWith("admin"));
      });
    }

    if (!admin) {
      console.warn(`[auth/login] No admin found for email: "${email}"`);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 3. Verify password (raw or trimmed in case of copy-paste trailing space)
    const isValid = verifyPassword(password, admin.passwordHash) || verifyPassword(password.trim(), admin.passwordHash);
    if (!isValid) {
      console.warn(`[auth/login] Password mismatch for: "${admin.email}"`);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await setAdminCookie(admin.email);
    return NextResponse.json({ ok: true, name: admin.name, email: admin.email });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
