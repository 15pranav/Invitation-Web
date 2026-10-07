// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const content = sqliteTable("event_content", {
  id: text("id").primaryKey(),
  draft: text("draft").notNull(),
  published: text("published").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at"),
});
export const rsvps = sqliteTable("rsvps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  attendance: text("attendance").notNull(),
  guests: integer("guests").notNull(),
  createdAt: text("created_at").notNull(),
});
export const limits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});
export const uploads = sqliteTable("media_uploads", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  uploadId: text("upload_id").notNull(),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  kind: text("kind").notNull(),
  size: integer("size").notNull(),
  parts: text("parts").notNull().default("[]"),
  state: text("state").notNull().default("pending"),
  expires: integer("expires").notNull(),
});
