import { Static, Type } from '@sinclair/typebox'
import { FastifyInstance, RouteGenericInterface } from 'fastify'
import { eq } from 'drizzle-orm/sql/expressions/conditions'
import { recording } from '../../../db/schema.js'
import db from '../../../db/db.js'
import type { RouteOptions } from '../../../types'
import sendDownloadableFile from '../../../util/sendDownloadableFile.js'
export default async function (
	app: FastifyInstance,
	{ store }: RouteOptions
) {
	app.get<RequestType>(
		'/download/:file',
		options,
		async (req, reply) => {
			const { file } = req.params

			const rec = await db.query.recording.findFirst({
				where: eq(recording.file, file),
			})

			if (!rec) {
				reply.status(404)
				return {
					error: `Recording with file ${file} not found`,
				}
			}

			return sendDownloadableFile(reply, store, file, rec.format)
		}
	)
}

const options = {
	schema: {
		params: Type.Object(
			{ file: Type.String() },
			{ additionalProperties: false }
		),
	},
}

interface RequestType extends RouteGenericInterface {
	Params: Static<typeof options.schema.params>
}
