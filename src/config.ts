import { Static, Type } from '@sinclair/typebox'
import getConfig from 'paranoid-config'
import parseTime from 'timestring'
import { StoreType } from './store/index.js'

const { Object, String, Integer, Array, Optional, Enum } = Type

const schema = Object({
	secret: String({ minLength: 10 }),
	logLevel: Optional(String()),
	host: Optional(String()),
	port: Integer({ minimum: 0 }),
	rtp: Object({
		host: Optional(String()),
		port: Integer({ minimum: 0 }),
		audio: Object({
			sampleRate: Integer({ minimum: 0 }),
			format: String(),
		}),
		allowedIps: Array(String(), {
			minItems: 1,
		}),
	}),
	db: Object({
		host: String(),
		port: Optional(Integer()),
		user: Optional(String()),
		password: Optional(String()),
		database: String(),
	}),
	recordings: Object({
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
	}),
	store: Object({
		type: Enum(StoreType),
		path: String(),
		webdav: Optional(
			Object({
				url: String(),
				user: String(),
				password: String(),
			})
		),
	}),
})

type ConfigType = Static<typeof schema>

type CompiledConfig = ConfigType & {
	recordings: ConfigType['recordings'] & {
		segmentTimeMs: number
		expiresMs: number
		shareLinkExpiresMs: number
	}
}

const config = await getConfig<ConfigType>(schema)

export default <CompiledConfig>{
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
}
