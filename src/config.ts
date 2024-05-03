import { createHash } from 'node:crypto'
import { Static, Type } from '@sinclair/typebox'
import getConfig from 'paranoid-config'
import parseTime from 'timestring'
//todo type add in config
import { StoreType } from './store/StoreFactory.js'

const {
	Object,
	String,
	Integer,
	Array,
	Optional,
	Enum,
	Union,
	Number,
} = Type

const RtpSchema = Object({
	host: Optional(String()),
	port: Integer({ minimum: 0 }),
	audio: Object({
		sampleRate: Integer({ minimum: 0 }),
		format: String(),
	}),
	allowedIps: Array(String(), {
		minItems: 1,
	}),
	noDataStopDelay: Number({ minimum: 0.5 }),
})

//todo resume to sqlite
const DbSchema = Object({
	type: Union([
		Type.Literal('postgres'),
		Type.Literal('sqlite'),
		Type.Literal('better-sqlite3'),
		Type.Literal('mariadb'),
		Type.Literal('mysql'),
	]),
	host: Optional(String()),
	port: Optional(Integer()),
	username: Optional(String()),
	password: Optional(String()),
	database: String(),
})

const RecordingSchema = Object({
	audio: Object({
		format: String(),
		bitrate: Optional(Integer({ minimum: 1 })),
		channels: Optional(Integer({ minimum: 1 })),
		codec: Optional(String()),
		sampleRate: Optional(Integer({ minimum: 1 })),
		options: Optional(Array(String())),
	}),
	segmentTime: String(),
	expires: String(),
	shareLinkExpires: String(),
})

const StoreSchema = Object({
	type: Enum(StoreType),
	path: String(),
	webdav: Optional(
		Object({
			url: String(),
			user: String(),
			password: String(),
		})
	),
})

const AuthSchema = Type.Object({
	sso: Type.Optional(
		Type.Object({
			enabled: Type.Boolean(),
			hostname: Type.String(),
			certPath: Type.String(),
			entryPoint: Type.String(),
		})
	),
	credentials: Type.Optional(Type.Object({})),
})

const schema = Object({
	http: Object({
		host: String(),
		port: Integer({ minimum: 0 }),
	}),
	secret: String({ minLength: 10 }),
	timezone: String(),
	logLevel: Optional(String()),
	rtp: RtpSchema,
	db: DbSchema,
	recordings: RecordingSchema,
	store: StoreSchema,
	auth: AuthSchema,
})

export type ConfigType = Static<typeof schema>

const config = await getConfig<ConfigType>(schema)

type CompiledConfig = ConfigType & {
	recordings: ConfigType['recordings'] & {
		segmentTimeMs: number
		expiresMs: number
		shareLinkExpiresMs: number
	}
	secretKey: Buffer
}

export default (<CompiledConfig>{
	...config,
	recordings: {
		...config.recordings,
		segmentTimeMs: parseTime(config.recordings.segmentTime, 'ms'),
		expiresMs: parseTime(config.recordings.expires, 'ms'),
		shareLinkExpiresMs: parseTime(
			config.recordings.shareLinkExpires,
			'ms'
		),
	},
	secretKey: createHash('sha256').update(config.secret).digest(),
}) satisfies CompiledConfig

export type DatabaseConfig = Static<typeof DbSchema>
export type RtpConfig = Static<typeof RtpSchema>
export type RecordingConfig = CompiledConfig['recordings']
