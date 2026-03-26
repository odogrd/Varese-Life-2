import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, sourcesTable, newslettersTable } from "@workspace/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/dashboard/stats", async (_req, res) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [eventsLast7, eventsPending, eventsApproved, newslettersSent, activeSources, unresolvedErrors, sourcesLastScrape] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(eventsTable).where(gte(eventsTable.createdAt, sevenDaysAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(eventsTable).where(eq(eventsTable.status, "pending")),
    db.select({ count: sql<number>`count(*)::int` }).from(eventsTable).where(eq(eventsTable.status, "approved")),
    db.select({ count: sql<number>`count(*)::int` }).from(newslettersTable).where(and(eq(newslettersTable.status, "exported"), gte(newslettersTable.updatedAt, monthStart))),
    db.select({ count: sql<number>`count(*)::int` }).from(sourcesTable).where(eq(sourcesTable.active, true)),
    db.execute(sql`SELECT COUNT(*)::int as count FROM error_logs WHERE resolved = false`),
    db.select({ id: sourcesTable.id, name: sourcesTable.name, lastScrapedAt: sourcesTable.lastScrapedAt }).from(sourcesTable).orderBy(sourcesTable.name),
  ]);

  res.json({
    eventsLast7Days: eventsLast7[0].count,
    eventsPending: eventsPending[0].count,
    eventsApproved: eventsApproved[0].count,
    newslettersSentThisMonth: newslettersSent[0].count,
    activeSources: activeSources[0].count,
    sourcesLastScrape: sourcesLastScrape,
    unresolvedErrors: (unresolvedErrors.rows[0] as any)?.count || 0,
  });
});

export default router;
