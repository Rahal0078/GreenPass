import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  registeredAt: text("registered_at").notNull().default(""),
  flNo: text("fl_no").notNull().default(""),
  customerName: text("customer_name").notNull(),
  place: text("place").notNull().default(""),
  kw: text("kw").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  consumerNo: text("consumer_no").notNull().default(""),
  totalAmount: text("total_amount").notNull().default(""),
  gmapLink: text("gmap_link").notNull().default(""),
  coordinator: text("coordinator").notNull().default(""),
  // Quotation workflow: PENDING → SENT → COORDINATOR_APPROVED → CLIENT_APPROVED
  //                                    ↘ COORDINATOR_REJECTED (re-upload required)
  quotation: text("quotation").notNull().default("PENDING"),
  quotationFileId: text("quotation_file_id").default(""),
  quotationToken: text("quotation_token").default(""),
  quotationClientToken: text("quotation_client_token").default(""),
  // 12 stage values stored as JSON array text
  stages: text("stages").notNull().default("[]"),
  // 12 per-stage remarks stored as JSON array text
  stageRemarks: text("stage_remarks").notNull().default("[]"),
  // Per-stage edit history: JSON array of 12 string[] (IST timestamps per change)
  stageLog: text("stage_log").notNull().default("[]"),
  remark: text("remark").notNull().default(""),
  // Activity log stored as JSON array text [{ts, actor, text}]
  activityLog: text("activity_log").notNull().default("[]"),
  // Closure workflow: PENDING → REQUESTED → APPROVED | REJECTED
  closureStatus: text("closure_status").notNull().default("PENDING"),
  closureToken: text("closure_token").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
