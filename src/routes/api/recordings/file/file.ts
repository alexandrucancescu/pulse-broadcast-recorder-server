import { Static, Type } from '@sinclair/typebox'
import { FastifyInstance, RouteGenericInterface } from 'fastify'
import parseRange from 'range-parser'
import { FormatContentTypeMap } from '../../../../util/contentType.js'

export default async function (app: FastifyInstance) {
	app.get<RequestType>('/*', options, async (req, reply) => {
		const file = req.params['*']

		const rec = await app.repository.recordings.findOneBy({ file })

		if (!rec) {
			reply.status(404)
			return {
				error: `Recording with file ${file} not found`,
			}
		}

		const size = await app.store.getFileSize(file)
		const readStream = app.store.createReadStream(file)

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

				const readStream = app.store.createReadStream(file, {
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

		return reply.send(app.store.createReadStream(file))
	})
}

const options = {
	schema: {
		params: Type.Object(
			{ '*': Type.String() },
			{ additionalProperties: false }
		),
	},
}

interface RequestType extends RouteGenericInterface {
	Params: Static<typeof options.schema.params>
}
