import createStore from './store/index.js'
import config from './config.js'
import log from './util/log.js'
import RtpReceiver from './rtp/RtpReceiver.js'
import RecordingManager from './RecordingManager.js'
import createServer from './server.js'

log.debug(config, 'Config')

log.info(
	`Recording expiry time: ${config.recordings.expires} = ${config.recordings.expiresMs}`
)

const rtpReceiver = new RtpReceiver({
	port: config.rtp.port,
	host: config.rtp.host,
})

let store = await createStore(config.store, log)

const recordingManager = new RecordingManager(rtpReceiver, store, log)

recordingManager.start()

const host = config.host ?? '0.0.0.0'
const port = config.port ?? 3000

await createServer(store).listen({ host, port })
