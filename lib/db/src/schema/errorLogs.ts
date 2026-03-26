import { pgTable, serial, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sourcesTable } from "./sources";
import { eventsTable } from "./events";

export const errorLogsTable = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  errorType: text("error_type").notNull(),
  sourceId: integer("source_id").references(() => sourcesTable.id, { onDelete: "set null" }),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  context: jsonb("context"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertErrorLogSchema = createInsertSchema(errorLogsTable).omit({ id: true, createdAt: true });
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;
export type ErrorLog = typeof errorLogsTable.$inferSelect;
