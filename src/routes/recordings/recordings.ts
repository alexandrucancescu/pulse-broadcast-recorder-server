import { Static, Type } from '@sinclair/typebox'
import { FastifyInstance, RouteGenericInterface } from 'fastify'
import { addMilliseconds } from 'date-fns'
import db from '../../db/db.js'
import { recording } from '../../db/schema.js'
import config from '../../config.js'
import { desc, count } from 'drizzle-orm'

export default async function (app: FastifyInstance) {
	app.get<RequestType>('/', options, async (req, reply) => {
		const { page = 0, perPage = 50, start, end } = req.query

		const query = db.query.recording.findMany({
			orderBy: [desc(recording.start)],
			offset: page * perPage,
			limit: perPage,
			where: (recordings, { gte, lte, and }) =>
				and(
					start
						? gte(recordings.end, new Date(start))
						: undefined,
					end ? lte(recordings.start, new Date(end)) : undefined
				),
		})

		const recordings = (await query).map((record) => ({
			...record,
			fileUrl: `/recordings/file/${record.file}`,
			expires: addMilliseconds(
				record.start,
				config.recordings.expiresMs
			),
		}))

		const [{ total }] = await db
			.select({ total: count() })
			.from(recording)

		return {
			total,
			page,
			perPage,
			pages: Math.ceil(total / perPage),
			recordings,
		}
	})
}

const options = {
	schema: {
		querystring: Type.Object(
			{
				page: Type.Optional(
					Type.Integer({ minimum: 0, default: 0 })
				),
				perPage: Type.Optional(
					Type.Integer({ minimum: 1, maximum: 1000, default: 50 })
				),
				start: Type.Optional(Type.Integer({ minimum: 0 })),
				end: Type.Optional(Type.Integer({ minimum: 0 })),
			},
			{ additionalProperties: false }
		),
		response: {},
	},
}

interface RequestType extends RouteGenericInterface {
	Querystring: Static<typeof options.schema.querystring>
	// Reply: Static<typeof options.schema.response[200]>;
}
