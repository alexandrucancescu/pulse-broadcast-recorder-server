import type { Logger } from 'pino'
import parseTimeString from 'timestring'
import { format as formatDate } from 'date-fns'
import RtpReceiver from './rtp/RtpReceiver.js'
import AudioEncoder from './encoder/AudioEncoder.js'
import createEncoder from './encoder/createEncoder.js'
import config from './config.js'
import Store from './store/Store.js'
import db from './db/db.js'
import { recording } from './db/schema.js'

const DEFAULT_SEGMENT_TIME = 15 * 60 * 1000

export default class RecordingManager {
	private readonly rtpReceiver: RtpReceiver
	private readonly log: Logger
	private readonly store: Store
	private encoder: AudioEncoder
	private filename: string
	private startTime: Date

	constructor(rtpReceiver: RtpReceiver, store: Store, log: Logger) {
		this.rtpReceiver = rtpReceiver
		this.store = store
		this.log = log
	}

	//todo HANDLE NO RTP DATA
	private startNewRecording() {
		this.filename =
			formatDate(Date.now(), 'yy-MM2-dd-HH-mm') +
			`.${config.recordings.audio.format}`

		this.startTime = new Date()

		this.encoder = createEncoder(
			config.rtp.audio,
			config.recordings.audio,
			this.store.createWriteStream(this.filename),
			this.log
		)

		this.encoder.start()
	}

	private async endRecording() {
		this.log.info(`Ending recording ${this.filename}`)
		this.encoder.end().then(() => {
			this.log.debug('Encoder ended')
		})

		const rec = await db
			.insert(recording)
			.values({
				start: this.startTime,
				end: new Date(),
				file: this.filename,
				format: this.encoder.format,
			})
			.returning()

		this.log.debug(rec, 'Saving recording')
	}

	start() {
		this.startNewRecording()

		this.rtpReceiver.on('data', (chunk) => {
			this.encoder.write(chunk)
		})

		const segmentLength = config.recordings.segmentTime
			? parseTimeString(config.recordings.segmentTime, 'ms')
			: DEFAULT_SEGMENT_TIME

		this.log.info(
			`Segment time: ${segmentLength / 1000}s = ${segmentLength}ms`
		)

		setInterval(() => {
			this.endRecording().then()
			this.startNewRecording()
		}, segmentLength)

		this.rtpReceiver.start()
	}
}
