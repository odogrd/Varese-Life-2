import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { settingsTable, promptsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { DEFAULT_PROMPTS } from "../lib/defaultPrompts";

const router = Router();
router.use(requireAuth);

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  if (existing.length) {
    await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

router.get("/settings", async (_req, res) => {
  const rows = await db.select().from(settingsTable);
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json({
    publicationDay: parseInt(map.publication_day || "4"),
    categories: JSON.parse(map.categories || "[]"),
    cronExpression: map.cron_expression || "0 8 * * *",
    cronEnabled: map.cron_enabled === "true",
    browseractSinglePageWorkflowId: map.browseract_single_page_workflow_id || null,
    appBaseUrl: map.app_base_url || null,
  });
});

router.put("/settings", async (req, res) => {
  const { publicationDay, categories, cronExpression, cronEnabled, browseractSinglePageWorkflowId, appBaseUrl } = req.body;
  if (publicationDay !== undefined) await setSetting("publication_day", String(publicationDay));
  if (categories) await setSetting("categories", JSON.stringify(categories));
  if (cronExpression) await setSetting("cron_expression", cronExpression);
  if (cronEnabled !== undefined) await setSetting("cron_enabled", String(cronEnabled));
  if (browseractSinglePageWorkflowId !== undefined) await setSetting("browseract_single_page_workflow_id", browseractSinglePageWorkflowId || "");
  if (appBaseUrl !== undefined) await setSetting("app_base_url", appBaseUrl || "");

  const rows = await db.select().from(settingsTable);
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json({
    publicationDay: parseInt(map.publication_day || "4"),
    categories: JSON.parse(map.categories || "[]"),
    cronExpression: map.cron_expression || "0 8 * * *",
    cronEnabled: map.cron_enabled === "true",
    browseractSinglePageWorkflowId: map.browseract_single_page_workflow_id || null,
    appBaseUrl: map.app_base_url || null,
  });
});

router.post("/settings/reset-prompts", async (_req, res) => {
  for (const p of DEFAULT_PROMPTS) {
    await db.update(promptsTable).set({ content: p.defaultContent, updatedAt: new Date() }).where(eq(promptsTable.key, p.key));
  }
  res.json({ message: "Prompt ripristinati ai valori predefiniti" });
});

router.post("/settings/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "Utente non trovato" });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Password attuale non corretta" });
  const hash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, userId));
  res.json({ message: "Password cambiata" });
});

export default router;
