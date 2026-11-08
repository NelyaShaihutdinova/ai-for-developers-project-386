import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const meetingTypes = sqliteTable('meeting_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
})
