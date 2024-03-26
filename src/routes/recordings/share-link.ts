import { FastifyInstance, RouteGenericInterface } from 'fastify'
import { eq } from 'drizzle-orm/sql/expressions/conditions'
import { Static, Type } from '@sinclair/typebox'
import { addMilliseconds } from 'date-fns'
import jwt from 'jsonwebtoken'
import db from '../../db/db.js'
import { recording } from '../../db/schema.js'
import config from '../../config.js'

export default async function (app: FastifyInstance) {
	app.get<RequestType>(
		'/:id/share-link',
		options,
		async (req, reply) => {
			const { id } = req.params

			const rec = await db.query.recording.findFirst({
				where: eq(recording.id, id),
			})

			if (!rec) {
				reply.status(404)
				return {
					error: `Recording with id ${id} not found`,
				}
			}

			const token = jwt.sign({ t: 'rec', id }, config.secret, {
				expiresIn: config.recordings.shareLinkExpiresMs / 1000,
			})

			const encodedToken = encodeURIComponent(token)

			console.log({ encodedToken })

			return {
				expires: addMilliseconds(
					new Date(),
					config.recordings.shareLinkExpiresMs
				),
				url: `/recordings/file/shared/${encodedToken}`,
			}
		}
	)
}

const options = {
	schema: {
		params: Type.Object(
			{ id: Type.Integer() },
			{ additionalProperties: false }
		),
	},
}

interface RequestType extends RouteGenericInterface {
	Params: Static<typeof options.schema.params>
}
