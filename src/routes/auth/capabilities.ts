import { FastifyInstance } from 'fastify'
import config from '../../config.js'
import { SSO_SAML_AUTH_PATH } from '../../constants.js'

export default async function (app: FastifyInstance) {
	app.get('/capabilities', async (req, reply) => {
		return {
			samlSso: {
				enabled: config.auth.sso && config.auth.sso.enabled,
				loginUrl: SSO_SAML_AUTH_PATH,
			},
			credentials: {
				enabled: config.auth.credentials !== undefined,
			},
		}
	})
}
