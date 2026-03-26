import { Router } from "express";
import { db } from "@workspace/db";
import { templatesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/templates", async (_req, res) => {
  const templates = await db.select().from(templatesTable).orderBy(templatesTable.name);
  res.json(templates);
});

router.post("/templates", async (req, res) => {
  const { name, description, introHtml, eventsHtml, footerHtml } = req.body;
  if (!name) return res.status(400).json({ error: "Nome richiesto" });
  const [template] = await db.insert(templatesTable).values({ name, description, introHtml, eventsHtml, footerHtml }).returning();
  res.status(201).json(template);
});

router.get("/templates/:id", async (req, res) => {
  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, parseInt(req.params.id))).limit(1);
  if (!template) return res.status(404).json({ error: "Template non trovato" });
  res.json(template);
});

router.put("/templates/:id", async (req, res) => {
  const { name, description, introHtml, eventsHtml, footerHtml } = req.body;
  const [template] = await db.update(templatesTable).set({ name, description, introHtml, eventsHtml, footerHtml })
    .where(eq(templatesTable.id, parseInt(req.params.id))).returning();
  res.json(template);
});

router.delete("/templates/:id", async (req, res) => {
  await db.delete(templatesTable).where(eq(templatesTable.id, parseInt(req.params.id)));
  res.json({ message: "Template eliminato" });
});

router.post("/templates/:id/set-default", async (req, res) => {
  await db.update(templatesTable).set({ isDefault: false });
  await db.update(templatesTable).set({ isDefault: true }).where(eq(templatesTable.id, parseInt(req.params.id)));
  res.json({ message: "Template impostato come predefinito" });
});

export default router;
