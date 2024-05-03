import { Static, Type } from '@sinclair/typebox'
import { FastifyInstance, RouteGenericInterface } from 'fastify'
import sendDownloadableFile from '../../../../util/sendDownloadableFile.js'

export default async function (app: FastifyInstance) {
	app.get<RequestType>(
		'/download/:file',
		options,
		async (req, reply) => {
			const { file } = req.params

			const rec = await app.repository.recordings.findOne({
				where: { file },
			})

			if (!rec) {
				reply.status(404)
				return {
					error: `Recording with file ${file} not found`,
				}
			}

			return sendDownloadableFile(
				reply,
				app.store,
				file,
				rec.format
			)
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
