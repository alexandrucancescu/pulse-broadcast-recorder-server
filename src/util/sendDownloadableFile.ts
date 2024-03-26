import Store from '../store/Store.js'
import { FormatContentTypeMap } from './contentType.js'
import { FastifyReply } from 'fastify'

export default async function (
	reply: FastifyReply,
	store: Store,
	filename: string,
	format: string
) {
	const size = await store.getFileSize(filename)
	const readStream = store.createReadStream(filename)

	if (!readStream) {
		reply.status(500)
		return {
			error: 'Internal Server error',
		}
	}

	reply.headers({
		'Content-Type': FormatContentTypeMap[format] ?? 'audio/*',
		'Content-Length': size,
		'Content-Disposition': `attachment; filename="${filename}"`,
	})

	return reply.send(readStream)
}
