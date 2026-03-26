import { pgTable, serial, text, boolean, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  introHtml: text("intro_html"),
  eventsHtml: text("events_html"),
  footerHtml: text("footer_html"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const newslettersTable = pgTable("newsletters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  introHtml: text("intro_html"),
  eventsHtml: text("events_html"),
  footerHtml: text("footer_html"),
  templateId: integer("template_id").references(() => templatesTable.id, { onDelete: "set null" }),
  dateFrom: date("date_from"),
  dateTo: date("date_to"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const newsletterEventsTable = pgTable("newsletter_events", {
  newsletterId: integer("newsletter_id").notNull().references(() => newslettersTable.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertTemplateSchema = createInsertSchema(templatesTable).omit({ id: true, createdAt: true });
export const insertNewsletterSchema = createInsertSchema(newslettersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Template = typeof templatesTable.$inferSelect;
export type Newsletter = typeof newslettersTable.$inferSelect;
export type NewsletterEvent = typeof newsletterEventsTable.$inferSelect;
