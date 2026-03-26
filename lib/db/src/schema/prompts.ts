import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const promptsTable = pgTable("prompts", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  content: text("content").notNull(),
  description: text("description").notNull().default(""),
  defaultContent: text("default_content").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPromptSchema = createInsertSchema(promptsTable).omit({ id: true });
export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof promptsTable.$inferSelect;
