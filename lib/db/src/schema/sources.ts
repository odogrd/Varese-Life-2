import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sourcesTable = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  browseractWorkflowId: text("browseract_workflow_id"),
  promptOverride: text("prompt_override"),
  active: boolean("active").notNull().default(true),
  lastScrapedAt: timestamp("last_scraped_at"),
  lastScrapeCount: integer("last_scrape_count"),
  lastScrapeErrors: integer("last_scrape_errors"),
  preferredScraper: text("preferred_scraper").notNull().default("browseract"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sourceUrlsTable = pgTable("source_urls", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => sourcesTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  label: text("label"),
  browseractWorkflowId: text("browseract_workflow_id"),
  active: boolean("active").notNull().default(true),
});

export const insertSourceSchema = createInsertSchema(sourcesTable).omit({ id: true, createdAt: true });
export const insertSourceUrlSchema = createInsertSchema(sourceUrlsTable).omit({ id: true });
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type InsertSourceUrl = z.infer<typeof insertSourceUrlSchema>;
export type Source = typeof sourcesTable.$inferSelect;
export type SourceUrl = typeof sourceUrlsTable.$inferSelect;
