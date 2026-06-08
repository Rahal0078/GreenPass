import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  ticketId: text("ticket_id").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email").notNull(),
  ksebConsumerNumber: text("kseb_consumer_number"),
  placeName: text("place_name").notNull(),
  district: text("district").notNull(),
  pincode: text("pincode").notNull(),
  address: text("address").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  locationSource: text("location_source"),
  complaintType: text("complaint_type").notNull(),
  description: text("description").notNull(),
  mediaUrls: text("media_urls"),
  status: text("status").notNull().default("open"),
  urgency: text("urgency").notNull().default("low"),
  urgencyColor: text("urgency_color"),
  technicianId: integer("technician_id"),
  pendingTechnicianIds: text("pending_technician_ids"),
  adminNotes: text("admin_notes"),
  completionNotes: text("completion_notes"),
  scheduledDate: text("scheduled_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaintsTable.$inferSelect;
