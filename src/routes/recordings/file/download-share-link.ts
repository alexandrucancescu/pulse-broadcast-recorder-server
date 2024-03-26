import { Static, Type } from '@sinclair/typebox'
import { FastifyInstance, RouteGenericInterface } from 'fastify'
import jwt from 'jsonwebtoken'
import config from '../../../config.js'
import db from '../../../db/db.js'
import sendDownloadableFile from '../../../util/sendDownloadableFile.js'
import { RouteOptions } from '../../../types'

export default async function (
	app: FastifyInstance,
	{ store }: RouteOptions
) {
	app.get<RequestType>(
		'/shared/:token',
		options,
		async (req, reply) => {
			try {
				const { t, id } = <{ t: string; id: number }>(
					jwt.verify(req.params.token, config.secret)
				)

				if (t !== 'rec')
					return reply
						.status(401)
						.send({ error: 'Share link is invalid' })

				const rec = await db.query.recording.findFirst({
					where: (rec, { eq }) => eq(rec.id, id),
				})

				if (!rec)
					return reply
						.status(404)
						.send({ error: 'Requested recording not available' })

				return sendDownloadableFile(
					reply,
					store,
					rec.file,
					rec.format
				)
			} catch (err) {
				if (err instanceof jwt.TokenExpiredError) {
					reply
						.status(401)
						.send({ error: 'Share link has expired' })
				} else if (err instanceof jwt.JsonWebTokenError) {
					reply
						.status(401)
						.send({ error: 'Share link is invalid' })
				} else {
					reply.status(500).send({
						error: 'An error occurred while verifying the share link',
					})
				}
			}
		}
	)
}

const options = {
	schema: {
		params: Type.Object(
			{ token: Type.String({ minLength: 1 }) },
			{ additionalProperties: false }
		),
	},
}

interface RequestType extends RouteGenericInterface {
	Params: Static<typeof options.schema.params>
}
