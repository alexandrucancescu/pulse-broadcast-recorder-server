import { readFileSync } from 'node:fs'
import path from 'node:path'
import SecureSession from '@fastify/secure-session'
import FastifyPassport from '@fastify/passport'
import { Strategy as LocalStrategy } from 'passport-local'
import {
	Strategy as SamlStrategy,
	VerifyWithoutRequest,
} from '@node-saml/passport-saml'
import FormBody from '@fastify/formbody'
import fp from 'fastify-plugin'
import config from '../config.js'
import { Logger } from 'pino'
import { Static, Type } from '@sinclair/typebox'
import {
	SSO_SAML_AUTH_PATH,
	SSO_SAML_CALLBACK_PATH,
} from '../constants.js'
import { request } from 'webdav/dist/node/request'

export default fp(async (app, { log }: { log: Logger }) => {
	app.register(SecureSession, {
		key: config.secretKey,
		cookieName: 'session',
		cookie: {
			secure: true,
			sameSite: 'none',
			path: '/',
		},
	})

	app.register(FastifyPassport.initialize())
	app.register(FastifyPassport.secureSession())
	app.register(FormBody)

	const WithRedirectQuerySchema = Type.Object({
		redirectUrl: Type.Optional(Type.String()),
	})

	if (config.auth.sso && config.auth.sso.enabled) {
		log.info(`SSO login enabled for ${config.auth.sso.hostname}`)

		const cert = readFileSync(
			path.join(config.auth.sso.certPath),
			'utf-8'
		)

		FastifyPassport.use(
			'saml',
			new SamlStrategy(
				{
					path: '/auth/saml/callback',
					entryPoint: config.auth.sso.entryPoint,
					issuer: 'pulse-recorder',
					cert,
					wantAssertionsSigned: false,
					wantAuthnResponseSigned: false,
					audience: false,
					protocol: 'https://',
					host: config.auth.sso.hostname,
				},
				((profile, done) => {
					//todo figure out what params can be extracted
					done(null, {
						email:
							profile?.email ??
							profile?.mail ??
							profile?.nameID ??
							(<any>profile?.attributes)?.email,
						...(profile?.attributes ?? {}),
					})
				}) as VerifyWithoutRequest,
				(profile, done) => done(null, profile ?? {})
			)
		)

		FastifyPassport.registerUserSerializer(async (user: any) => {
			return JSON.stringify({
				firstName: user.firstName,
				lastName: user.lastName,
				username: user.username,
				email: user.email,
			})
		})

		FastifyPassport.registerUserDeserializer(
			async (user: string) => {
				return JSON.parse(user)
			}
		)

		app.get<{ Querystring: Static<typeof WithRedirectQuerySchema> }>(
			SSO_SAML_AUTH_PATH,
			{
				schema: {
					querystring: Type.Object({
						redirectUrl: Type.Optional(Type.String({})),
					}),
				},
			},
			(req, reply) => {
				const { redirectUrl } = req.query

				if (redirectUrl) {
					log.debug('setting redir', { redirectUrl })
					req.session.set('redirectUrl', redirectUrl)
					req.session.options({ maxAge: 60 })
				} else if (req.session.redirectUrl) {
					req.session.set('redirectUrl', undefined)
				}

				FastifyPassport.authenticate('saml', {
					failureRedirect: '/',
					failureFlash: true,
					state: redirectUrl,
				}).bind(app)(req, reply)
			}
		)

		app.post(SSO_SAML_CALLBACK_PATH, (req, reply) => {
			const redirectUrl = req.session.redirectUrl ?? '/'

			FastifyPassport.authenticate('saml', {
				failureRedirect: '/',
				failureFlash: true,
				successRedirect: redirectUrl ?? '/',
			}).bind(app)(req, reply)
		})
	}

	if (config.auth.credentials) {
		log.info('Credentials login enabled')

		FastifyPassport.use(
			'credentials',
			new LocalStrategy({}, (username, password, done) => {
				if (username === 'bobita' && password === 'boboaica') {
					done(null, {
						email: username,
					})
				} else {
					done(null, false)
				}
			})
		)

		const BodySchema = Type.Object({
			username: Type.String(),
			password: Type.String(),
		})

		app.post<{
			Body: Static<typeof BodySchema>
			Querystring: Static<typeof WithRedirectQuerySchema>
		}>(
			'/auth/credentials/login',
			{
				schema: {
					body: BodySchema,
					querystring: WithRedirectQuerySchema,
				},
			},
			(req, reply) => {
				const { redirectUrl } = req.query

				FastifyPassport.authenticate(
					'credentials',
					{
						failureRedirect: '/?failure',
						successRedirect: redirectUrl ?? '/',
					},
					async (request, reply, err, user, info, status) => {
						console.debug({
							err,
							user,
							info,
							status,
							isAuth: request.isAuthenticated(),
							session: request.session,
						})

						if (!user) {
							return reply
								.status(401)
								.send({ isAuthenticated: false })
						}

						const serialized = await req.passport.serializeUser(
							user,
							req
						)

						req.session.set('passport', serialized)
						return reply
							.status(200)
							.send({ isAuthenticated: true, user })
					}
				).bind(app)(req, reply)
			}
		)
	}
	app.get('/', async (req, reply) => {
		return {
			user: req.user,
			isAuth: req.isAuthenticated(),
		}
	})
})
