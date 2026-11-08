import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'

export const meetingTypes = sqliteTable('meeting_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
})

export const bookings = sqliteTable(
  'bookings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    meetingTypeId: integer('meeting_type_id').notNull().references(() => meetingTypes.id, { onDelete: 'restrict' }),
    startAt: text('start_at').notNull(),
    endAt: text('end_at').notNull(),
    guestName: text('guest_name').notNull(),
    guestEmail: text('guest_email').notNull(),
    createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
  },
  (table) => ({
    meetingTypeStartIdx: index('meeting_type_start_idx').on(table.meetingTypeId, table.startAt),
  })
)
