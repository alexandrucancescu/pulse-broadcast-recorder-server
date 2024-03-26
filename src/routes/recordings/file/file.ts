import { Static, Type } from '@sinclair/typebox'
import { FastifyInstance, RouteGenericInterface } from 'fastify'
import { eq } from 'drizzle-orm/sql/expressions/conditions'
import parseRange from 'range-parser'
import { recording } from '../../../db/schema.js'
import db from '../../../db/db.js'
import type { RouteOptions } from '../../../types'
import { FormatContentTypeMap } from '../../../util/contentType.js'

export default async function (
	app: FastifyInstance,
	{ store }: RouteOptions
) {
	app.get<RequestType>('/:file', options, async (req, reply) => {
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

		const size = await store.getFileSize(file)
		const readStream = store.createReadStream(file)

		if (!readStream) {
			reply.status(500)
			return {
				error: 'Internal Server error',
			}
		}

		if (size > 0) {
			reply.header('Content-Length', size)
		}

		reply.header(
			'Content-Type',
			FormatContentTypeMap[rec.format] ?? 'audio/*'
		)

		if (req.headers.range) {
			const ranges = parseRange(size, req.headers.range)

			if (ranges === -1) {
				reply.status(400)
				return {
					error: 'Invalid range header',
				}
			} else if (ranges === -2) {
				reply.status(416)
				return { error: 'Range Not Satisfiable' }
			} else {
				const { start, end } = ranges[0]

				const readStream = store.createReadStream(file, {
					start,
					end: end + 1, // Some implementations require the end to be inclusive
				})

				reply.headers({
					'Content-Type':
						FormatContentTypeMap[rec.format] ?? 'audio/*',
					'Content-Range': `bytes ${start}-${end}/${size}`,
					'Content-Length': end - start + 1,
					'Accept-Ranges': 'bytes',
				})

				reply.status(206)

				return reply.send(readStream)
			}
		}

		return reply.send(store.createReadStream(file))
	})
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
