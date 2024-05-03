await import('reflect-metadata')
import createStore from './store/StoreFactory.js'
import config from './config.js'
import log from './util/log.js'
import RtpReceiver from './rtp/RtpReceiver.js'
import RecordingManager from './RecordingManager.js'
import createServer from './server.js'
import createAppDataSource from './AppDataSource.js'
import Recording from './entities/Recording.js'

log.debug(config, 'Config')

log.info(
	`Recording expiry time: ${config.recordings.expires} = ${config.recordings.expiresMs}`
)

const db = await createAppDataSource(config.db)

const rtpReceiver = new RtpReceiver({
	port: config.rtp.port,
	host: config.rtp.host,
})

const store = await createStore(config.store, log)

const recordingManager = new RecordingManager(
	rtpReceiver,
	store,
	log,
	db.getRepository(Recording)
)

recordingManager.start()

await createServer(store, db)
	.listen(config.http)
	.then(() =>
		log.info(
			`HTTP listening on ${config.http.host}:${config.http.port}`
		)
	)
