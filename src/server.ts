import Fastify from 'fastify'
import ajvErrors from 'ajv-errors'
import Autoload from '@fastify/autoload'
import { dirname } from 'desm'
import log from './util/log.js'
import { join } from 'node:path'
import Cors from '@fastify/cors'
import Store from './store/Store.js'

export default function (store: Store) {
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

	app.register(Cors, {
		origin: '*',
	})

	app.register(Autoload, {
		dir: join(dirname(import.meta.url), './routes'),
		options: { store },
	})

	return app
}
