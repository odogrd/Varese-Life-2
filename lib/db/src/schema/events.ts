import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sourcesTable } from "./sources";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => sourcesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  dateStart: timestamp("date_start"),
  dateEnd: timestamp("date_end"),
  dateDisplay: text("date_display"),
  dateParseConfidence: text("date_parse_confidence").notNull().default("high"),
  recurring: boolean("recurring").notNull().default(false),
  location: text("location"),
  descriptionRaw: text("description_raw"),
  descriptionClean: text("description_clean"),
  imageUrl: text("image_url"),
  sourceUrl: text("source_url"),
  category: text("category"),
  price: text("price"),
  status: text("status").notNull().default("pending"),
  includedInNewsletter: boolean("included_in_newsletter").notNull().default(false),
  sourceType: text("source_type").notNull().default("scraped"),
  scraper: text("scraper"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
