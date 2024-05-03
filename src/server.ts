import { join } from 'node:path'
import Fastify from 'fastify'
import ajvErrors from 'ajv-errors'
import Autoload from '@fastify/autoload'
import { dirname } from 'desm'
import log from './util/log.js'
import Cors from '@fastify/cors'
import { DataSource } from 'typeorm'
import Store from './store/Store.js'
import Recording from './entities/Recording.js'

export default function (store: Store, db: DataSource) {
	const app = Fastify({
		trustProxy: true,
		logger: log.child(
			{},
			{ msgPrefix: '[FASTIFY] ', level: 'warn' }
		),
		ajv: {
			plugins: [ajvErrors],
			customOptions: {
				allErrors: true,
			},
		},
		maxParamLength: 250,
	})

	app.decorate('repository', {
		recordings: db.getRepository(Recording),
	})

	app.decorate('store', store)

	//todo revise
	app.register(Cors, {
		origin: '*',
	})

	app.register(Autoload, {
		dir: join(dirname(import.meta.url), './plugins'),
		options: { log },
	})

	app.register(Autoload, {
		dir: join(dirname(import.meta.url), './routes'),
	})

	return app
}
