import { Static, Type } from '@sinclair/typebox'
import { FastifyInstance, RouteGenericInterface } from 'fastify'
import { addMilliseconds } from 'date-fns'
import { MoreThanOrEqual, LessThanOrEqual } from 'typeorm'
import config from '../../../config.js'

export default async function (app: FastifyInstance) {
	app.get<RequestType>('/', options, async (req, reply) => {
		const { page = 0, perPage = 50, start, end } = req.query

		const whereConditions = {
			end: start ? MoreThanOrEqual(new Date(start)) : undefined,
			start: end ? LessThanOrEqual(new Date(end)) : undefined,
		}

		const recordings = (
			await app.repository.recordings.find({
				take: perPage,
				skip: page * perPage,
				order: {
					start: 'DESC',
				},
				where: whereConditions,
			})
		).map((record) => ({
			...record,
			fileUrl: `/api/recordings/file/${record.file}`,
			expires: addMilliseconds(
				record.start,
				config.recordings.expiresMs
			),
		}))

		const total = await app.repository.recordings.count({
			where: whereConditions,
		})

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
