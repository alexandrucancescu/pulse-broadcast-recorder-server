import {
	pgTable as table,
	timestamp,
	serial,
	varchar,
} from 'drizzle-orm/pg-core'

export const recording = table('recording', {
	id: serial('id').primaryKey(),
	start: timestamp('start', { withTimezone: true }).notNull(),
	end: timestamp('end', { withTimezone: true }).notNull(),
	file: varchar('file').notNull(),
	format: varchar('format').notNull(),
})
