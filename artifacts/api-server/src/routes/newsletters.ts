import { Router } from "express";
import { db } from "@workspace/db";
import { newslettersTable, newsletterEventsTable, eventsTable, templatesTable } from "@workspace/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { claudeGenerateNewsletterIntro } from "../lib/claude";

const router = Router();
router.use(requireAuth);

function renderEventCard(event: typeof eventsTable.$inferSelect, template?: string): string {
  const tpl = template || `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-left:4px solid #2E7D32;padding-left:16px;font-family:Georgia,'Times New Roman',serif;">
  <tr><td><h3 style="margin:0 0 4px;color:#1A1A1A;font-size:18px;">{{event_title}}</h3></td></tr>
  <tr><td style="color:#2E7D32;font-size:13px;font-family:Arial,sans-serif;margin-bottom:4px;">{{event_date}} • {{event_location}}</td></tr>
  {{event_price}}<tr><td style="color:#1A1A1A;font-size:15px;line-height:1.6;margin-top:8px;">{{event_description}}</td></tr>
  <tr><td><a href="{{event_url}}" style="color:#2E7D32;font-size:13px;font-family:Arial,sans-serif;">Scopri di più →</a></td></tr>
</table>`;

  return tpl
    .replace(/\{\{event_title\}\}/g, event.title)
    .replace(/\{\{event_date\}\}/g, event.dateDisplay || "")
    .replace(/\{\{event_location\}\}/g, event.location || "")
    .replace(/\{\{event_description\}\}/g, event.descriptionClean || event.descriptionRaw || "")
    .replace(/\{\{event_price\}\}/g, event.price ? `<tr><td style="color:#555;font-size:13px;font-family:Arial,sans-serif;">Prezzo: ${event.price}</td></tr>` : "")
    .replace(/\{\{event_url\}\}/g, event.sourceUrl || "#")
    .replace(/\{\{event_image\}\}/g, "");
}

router.get("/newsletters", async (_req, res) => {
  const newsletters = await db.select().from(newslettersTable).orderBy(newslettersTable.createdAt);
  res.json(newsletters);
});

router.post("/newsletters", async (req, res) => {
  const { title, templateId, dateFrom, dateTo } = req.body;
  if (!title) return res.status(400).json({ error: "Titolo richiesto" });
  const [newsletter] = await db.insert(newslettersTable).values({ title, templateId, dateFrom, dateTo }).returning();
  res.status(201).json(newsletter);
});

router.get("/newsletters/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [newsletter] = await db.select().from(newslettersTable).where(eq(newslettersTable.id, id)).limit(1);
  if (!newsletter) return res.status(404).json({ error: "Newsletter non trovata" });

  const eventLinks = await db.select().from(newsletterEventsTable)
    .where(eq(newsletterEventsTable.newsletterId, id)).orderBy(asc(newsletterEventsTable.sortOrder));
  const eventIds = eventLinks.map(e => e.eventId);
  const events = eventIds.length
    ? await db.select().from(eventsTable).where(inArray(eventsTable.id, eventIds))
    : [];
  const orderedEvents = eventIds.map(id => events.find(e => e.id === id)).filter(Boolean);

  res.json({ ...newsletter, events: orderedEvents });
});

router.put("/newsletters/:id", async (req, res) => {
  const [newsletter] = await db.update(newslettersTable).set({
    ...req.body, updatedAt: new Date()
  }).where(eq(newslettersTable.id, parseInt(req.params.id))).returning();
  res.json(newsletter);
});

router.delete("/newsletters/:id", async (req, res) => {
  await db.delete(newslettersTable).where(eq(newslettersTable.id, parseInt(req.params.id)));
  res.json({ message: "Newsletter eliminata" });
});

router.put("/newsletters/:id/events", async (req, res) => {
  const id = parseInt(req.params.id);
  const { eventIds } = req.body;
  await db.delete(newsletterEventsTable).where(eq(newsletterEventsTable.newsletterId, id));
  if (Array.isArray(eventIds) && eventIds.length) {
    await db.insert(newsletterEventsTable).values(
      eventIds.map((eventId: number, i: number) => ({ newsletterId: id, eventId, sortOrder: i }))
    );
    await db.update(eventsTable).set({ includedInNewsletter: true }).where(inArray(eventsTable.id, eventIds));
  }
  res.json({ message: "Lista eventi aggiornata" });
});

router.get("/newsletters/:id/export", async (req, res) => {
  const id = parseInt(req.params.id);
  const [newsletter] = await db.select().from(newslettersTable).where(eq(newslettersTable.id, id)).limit(1);
  if (!newsletter) return res.status(404).json({ error: "Newsletter non trovata" });

  const eventLinks = await db.select().from(newsletterEventsTable)
    .where(eq(newsletterEventsTable.newsletterId, id)).orderBy(asc(newsletterEventsTable.sortOrder));
  const eventIds = eventLinks.map(e => e.eventId);
  const events = eventIds.length
    ? await db.select().from(eventsTable).where(inArray(eventsTable.id, eventIds))
    : [];
  const orderedEvents = eventIds.map(id => events.find(e => e.id === id)).filter(Boolean) as typeof eventsTable.$inferSelect[];

  let eventsTemplate: string | undefined;
  if (newsletter.templateId) {
    const [tmpl] = await db.select().from(templatesTable).where(eq(templatesTable.id, newsletter.templateId)).limit(1);
    eventsTemplate = tmpl?.eventsHtml || undefined;
  }

  const eventsHtml = orderedEvents.map(e => renderEventCard(e, eventsTemplate)).join("\n");

  await db.update(newslettersTable).set({ status: "exported", eventsHtml, updatedAt: new Date() })
    .where(eq(newslettersTable.id, id));

  res.json({
    title: newsletter.title,
    introHtml: newsletter.introHtml || "",
    eventsHtml,
    footerHtml: newsletter.footerHtml || "",
  });
});

router.post("/newsletters/:id/generate-intro", async (req, res) => {
  const id = parseInt(req.params.id);
  const eventLinks = await db.select().from(newsletterEventsTable)
    .where(eq(newsletterEventsTable.newsletterId, id)).orderBy(asc(newsletterEventsTable.sortOrder));
  const eventIds = eventLinks.map(e => e.eventId);
  const events = eventIds.length
    ? await db.select({ title: eventsTable.title, dateDisplay: eventsTable.dateDisplay, location: eventsTable.location })
        .from(eventsTable).where(inArray(eventsTable.id, eventIds))
    : [];

  const introText = await claudeGenerateNewsletterIntro(events);
  const introHtml = `<p>${introText.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
  await db.update(newslettersTable).set({ introHtml, updatedAt: new Date() }).where(eq(newslettersTable.id, id));
  res.json({ introHtml });
});

export default router;
