import { Type } from '@sinclair/typebox'
import { FastifyInstance, RouteGenericInterface } from 'fastify'

export default async function (app: FastifyInstance) {
	app.get<RequestType>('/state', options, async (req, reply) => {
		return {
			isAuthenticated: req.isAuthenticated(),
			user: req.user ?? undefined,
		}
	})
}

const options = {
	schema: {
		params: Type.Object({}, { additionalProperties: false }),
		querystring: Type.Object({}, { additionalProperties: false }),
		response: {},
	},
}

interface RequestType extends RouteGenericInterface {
	// Body: Static<typeof options.schema.body>
	// Querystring: Static<typeof options.schema.querystring>
	// Params: Static<typeof options.schema.params>;
	// Reply: Static<typeof options.schema.response[200]>;
}
