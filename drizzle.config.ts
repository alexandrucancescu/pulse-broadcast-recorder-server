import { Config } from 'drizzle-kit'

const config = require('./node_modules/config')

export default {
	schema: './src/db/schema.ts',
	out: './drizzle',
	driver: 'pg',
	dbCredentials: config.db,
} satisfies Config
