import postgres from 'postgres'
import config from '../config.js'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import * as schema from './schema.js'

const client = postgres(config.db)

const db = drizzle(client, {
	schema,
	logger: true,
})

await migrate(db, { migrationsFolder: 'drizzle' })

export default db
