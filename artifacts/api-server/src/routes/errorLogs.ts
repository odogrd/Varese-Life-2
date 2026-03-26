import { Router } from "express";
import { db } from "@workspace/db";
import { errorLogsTable, sourcesTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/error-logs", async (req, res) => {
  const { type, sourceId, resolved, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  let conditions: any[] = [];
  if (type) conditions.push(eq(errorLogsTable.errorType, type));
  if (sourceId) conditions.push(eq(errorLogsTable.sourceId, parseInt(sourceId)));
  if (resolved !== undefined) conditions.push(eq(errorLogsTable.resolved, resolved === "true"));

  const where = conditions.length ? and(...conditions) : undefined;

  const [logs, [{ count }]] = await Promise.all([
    db.select({
      id: errorLogsTable.id, errorType: errorLogsTable.errorType,
      sourceId: errorLogsTable.sourceId, sourceName: sourcesTable.name,
      eventId: errorLogsTable.eventId, message: errorLogsTable.message,
      context: errorLogsTable.context, resolved: errorLogsTable.resolved,
      createdAt: errorLogsTable.createdAt,
    }).from(errorLogsTable)
      .leftJoin(sourcesTable, eq(errorLogsTable.sourceId, sourcesTable.id))
      .where(where)
      .orderBy(errorLogsTable.createdAt)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(errorLogsTable).where(where),
  ]);

  res.json({ logs, total: count, page: pageNum, limit: limitNum });
});

router.post("/error-logs/:id/resolve", async (req, res) => {
  await db.update(errorLogsTable).set({ resolved: true }).where(eq(errorLogsTable.id, parseInt(req.params.id)));
  res.json({ message: "Errore segnato come risolto" });
});

router.get("/error-logs/unresolved-count", async (_req, res) => {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(errorLogsTable).where(eq(errorLogsTable.resolved, false));
  res.json({ count });
});

export default router;
