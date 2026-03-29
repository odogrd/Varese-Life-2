import { Router } from "express";
import { db } from "@workspace/db";
import { sourcesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { processRawEvents } from "../lib/eventProcessing";
import { getBrowserActTaskStatus } from "../lib/browseract";

const router = Router();

router.post("/browseract/webhook/:sourceId/:sourceUrlId", async (req, res) => {
  const sourceId = parseInt(req.params.sourceId);
  const [source] = await db.select().from(sourcesTable).where(eq(sourcesTable.id, sourceId)).limit(1);
  if (!source) return res.status(404).json({ error: "Fonte non trovata" });

  const body = req.body;
  let events: unknown[] = [];
  if (Array.isArray(body)) {
    events = body;
  } else if (body.events && Array.isArray(body.events)) {
    events = body.events;
  } else if (body.result && Array.isArray(body.result)) {
    events = body.result;
  } else if (body.data && Array.isArray(body.data)) {
    events = body.data;
  } else {
    events = [body];
  }

  const { saved, errors } = await processRawEvents(events as any[], sourceId, "browseract");
  await db.update(sourcesTable).set({
    lastScrapedAt: new Date(),
    lastScrapeCount: sql`COALESCE(last_scrape_count, 0) + ${saved}`,
    lastScrapeErrors: sql`COALESCE(last_scrape_errors, 0) + ${errors}`,
  }).where(eq(sourcesTable.id, sourceId));
  res.json({ message: "OK" });
});

router.get("/browseract/task/:taskId/status", async (req, res) => {
  try {
    const status = await getBrowserActTaskStatus(req.params.taskId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
