import { Router } from "express";
import { db } from "@workspace/db";
import { sourcesTable, sourceUrlsTable, errorLogsTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { triggerBrowserActWorkflow } from "../lib/browseract";
import { processRawEvents } from "../lib/eventProcessing";
import { claudeFetchAndExtract } from "../lib/claude";

const router = Router();
router.use(requireAuth);

async function getSourceWithUrls(id: number) {
  const [source] = await db.select().from(sourcesTable).where(eq(sourcesTable.id, id)).limit(1);
  if (!source) return null;
  const urls = await db.select().from(sourceUrlsTable).where(eq(sourceUrlsTable.sourceId, id));
  return { ...source, urls };
}

router.get("/sources", async (_req, res) => {
  const sources = await db.select().from(sourcesTable).orderBy(sourcesTable.name);
  const result = await Promise.all(sources.map(async (s) => {
    const urls = await db.select().from(sourceUrlsTable).where(eq(sourceUrlsTable.sourceId, s.id));
    return { ...s, urls };
  }));
  res.json(result);
});

router.get("/sources/:id", async (req, res) => {
  const source = await getSourceWithUrls(parseInt(req.params.id));
  if (!source) return res.status(404).json({ error: "Fonte non trovata" });
  res.json(source);
});

router.post("/sources", async (req, res) => {
  const { name, browseractWorkflowId, promptOverride, active = true, preferredScraper = "browseract", urls = [] } = req.body;
  if (!name) return res.status(400).json({ error: "Nome richiesto" });
  if (!urls.length) return res.status(400).json({ error: "Almeno un URL richiesto" });

  const [source] = await db.insert(sourcesTable).values({
    name, browseractWorkflowId, promptOverride, active, preferredScraper
  }).returning();

  for (const url of urls) {
    await db.insert(sourceUrlsTable).values({
      sourceId: source.id, url: url.url, label: url.label || null,
      browseractWorkflowId: url.browseractWorkflowId || null, active: url.active ?? true,
    });
  }

  const result = await getSourceWithUrls(source.id);
  res.status(201).json(result);
});

router.put("/sources/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, browseractWorkflowId, promptOverride, active, preferredScraper, urls } = req.body;

  await db.update(sourcesTable).set({
    name, browseractWorkflowId, promptOverride, active, preferredScraper
  }).where(eq(sourcesTable.id, id));

  if (urls) {
    const existingUrls = await db.select().from(sourceUrlsTable).where(eq(sourceUrlsTable.sourceId, id));
    const existingIds = existingUrls.map(u => u.id);
    const incomingIds = urls.filter((u: { id?: number }) => u.id).map((u: { id: number }) => u.id);
    const toDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (toDelete.length) await db.delete(sourceUrlsTable).where(inArray(sourceUrlsTable.id, toDelete));

    for (const url of urls) {
      if (url.id) {
        await db.update(sourceUrlsTable).set({
          url: url.url, label: url.label || null,
          browseractWorkflowId: url.browseractWorkflowId || null, active: url.active ?? true,
        }).where(eq(sourceUrlsTable.id, url.id));
      } else {
        await db.insert(sourceUrlsTable).values({
          sourceId: id, url: url.url, label: url.label || null,
          browseractWorkflowId: url.browseractWorkflowId || null, active: url.active ?? true,
        });
      }
    }
  }

  const result = await getSourceWithUrls(id);
  res.json(result);
});

router.delete("/sources/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(sourcesTable).where(eq(sourcesTable.id, id));
  res.json({ message: "Fonte eliminata" });
});

async function triggerScrapeForSource(source: typeof sourcesTable.$inferSelect, urls: typeof sourceUrlsTable.$inferSelect[], req: any) {
  const appBaseUrl = process.env.APP_BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const taskIds: string[] = [];

  for (const url of urls.filter(u => u.active)) {
    const workflowId = url.browseractWorkflowId || source.browseractWorkflowId;

    if (source.preferredScraper === "claude_fallback" || !workflowId) {
      // Claude fallback - run inline
      try {
        const { events } = await claudeFetchAndExtract(url.url);
        await processRawEvents(events as any[], source.id, "claude_fallback");
        await db.update(sourcesTable).set({ lastScrapedAt: new Date() }).where(eq(sourcesTable.id, source.id));
      } catch (err) {
        await db.insert(errorLogsTable).values({
          errorType: "scraping_error",
          sourceId: source.id,
          message: `Errore Claude fallback: ${String(err)}`,
          context: { url: url.url },
          resolved: false,
        });
      }
    } else {
      try {
        const callbackUrl = `${appBaseUrl}/api/browseract/webhook/${source.id}/${url.id}`;
        const { taskId } = await triggerBrowserActWorkflow(workflowId, callbackUrl);
        taskIds.push(taskId);
      } catch (err) {
        const errMsg = String(err);
        if (errMsg.includes("QUOTA_EXCEEDED")) {
          await db.insert(errorLogsTable).values({
            errorType: "browseract_quota",
            sourceId: source.id,
            message: "Crediti BrowserAct esauriti",
            context: { url: url.url },
            resolved: false,
          });
        } else {
          await db.insert(errorLogsTable).values({
            errorType: "browseract_error",
            sourceId: source.id,
            message: errMsg,
            context: { url: url.url },
            resolved: false,
          });
          // Fallback to Claude
          try {
            const { events } = await claudeFetchAndExtract(url.url);
            await processRawEvents(events as any[], source.id, "claude_fallback");
          } catch { /* ignore fallback errors */ }
        }
      }
    }
  }

  await db.update(sourcesTable).set({ lastScrapedAt: new Date() }).where(eq(sourcesTable.id, source.id));
  return taskIds;
}

router.post("/sources/:id/scrape", async (req, res) => {
  const id = parseInt(req.params.id);
  const [source] = await db.select().from(sourcesTable).where(eq(sourcesTable.id, id)).limit(1);
  if (!source) return res.status(404).json({ error: "Fonte non trovata" });
  const urls = await db.select().from(sourceUrlsTable).where(eq(sourceUrlsTable.sourceId, id));
  const taskIds = await triggerScrapeForSource(source, urls, req);
  res.json({ message: "Scraping avviato", taskIds });
});

router.post("/sources/scrape-all", async (req, res) => {
  const sources = await db.select().from(sourcesTable).where(eq(sourcesTable.active, true));
  const allTaskIds: string[] = [];
  for (const source of sources) {
    const urls = await db.select().from(sourceUrlsTable).where(eq(sourceUrlsTable.sourceId, source.id));
    const taskIds = await triggerScrapeForSource(source, urls, req);
    allTaskIds.push(...taskIds);
  }
  res.json({ message: `Scraping avviato per ${sources.length} fonti`, taskIds: allTaskIds });
});

router.post("/sources/:id/import", async (req, res) => {
  const id = parseInt(req.params.id);
  const { events } = req.body;
  if (!Array.isArray(events)) return res.status(400).json({ error: "Array di eventi richiesto" });
  const { saved, errors } = await processRawEvents(events, id, "browseract");
  res.json({ message: `Importati ${saved} eventi, ${errors} errori` });
});

export default router;
