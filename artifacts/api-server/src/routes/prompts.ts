import { Router } from "express";
import { db } from "@workspace/db";
import { promptsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/prompts", async (_req, res) => {
  const prompts = await db.select().from(promptsTable).orderBy(promptsTable.label);
  res.json(prompts);
});

router.get("/prompts/:id", async (req, res) => {
  const [prompt] = await db.select().from(promptsTable).where(eq(promptsTable.id, parseInt(req.params.id))).limit(1);
  if (!prompt) return res.status(404).json({ error: "Prompt non trovato" });
  res.json(prompt);
});

router.put("/prompts/:id", async (req, res) => {
  const { label, content, description } = req.body;
  const [prompt] = await db.update(promptsTable).set({
    label, content, description, updatedAt: new Date()
  }).where(eq(promptsTable.id, parseInt(req.params.id))).returning();
  res.json(prompt);
});

router.post("/prompts/:id/reset", async (req, res) => {
  const [current] = await db.select().from(promptsTable).where(eq(promptsTable.id, parseInt(req.params.id))).limit(1);
  if (!current) return res.status(404).json({ error: "Prompt non trovato" });
  const [prompt] = await db.update(promptsTable).set({
    content: current.defaultContent, updatedAt: new Date()
  }).where(eq(promptsTable.id, parseInt(req.params.id))).returning();
  res.json(prompt);
});

export default router;
