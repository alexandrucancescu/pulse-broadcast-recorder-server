import type { Logger } from 'pino'
import { format as formatDate } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { Repository } from 'typeorm'
import Recording from './entities/Recording'
import RtpReceiver from './rtp/RtpReceiver.js'
import AudioEncoder from './encoder/AudioEncoder.js'
import createEncoder, {
	getExtensionForAudioFormat,
} from './encoder/createEncoder.js'
import config from './config.js'
import Store from './store/Store.js'
import { FILE_DATE_FORMAT } from './constants.js'

export default class RecordingManager {
	private readonly rtpReceiver: RtpReceiver
	private readonly log: Logger
	private readonly store: Store
	private readonly recordingRepo: Repository<Recording>
	private encoder?: AudioEncoder
	private currentFilename: string
	private currentStartTime: number

	private lastReceivedDataTime: number
	private isStoppedForNoData: boolean

	constructor(
		rtpReceiver: RtpReceiver,
		store: Store,
		log: Logger,
		recordingRepo: Repository<Recording>
	) {
		this.rtpReceiver = rtpReceiver
		this.store = store
		this.log = log
		this.recordingRepo = recordingRepo
		this.lastReceivedDataTime = Date.now()
	}

	private async startNewRecording() {
		const timeZoneDate = utcToZonedTime(new Date(), config.timezone)

		this.currentFilename =
			formatDate(timeZoneDate, FILE_DATE_FORMAT) +
			'.' +
			getExtensionForAudioFormat(config.recordings.audio.format)

		const writeStream = await this.store.createWriteStream(
			this.currentFilename
		)

		writeStream.on('error', (err) => {
			this.log.error(err, 'Error store on write stream')
		})

		writeStream.on('end', () =>
			this.log.info('Store write stream started')
		)

		//TODO Handle encoder error
		this.encoder = createEncoder(
			config.rtp.audio,
			config.recordings.audio,
			writeStream,
			this.log
		)

		this.currentStartTime = Date.now()
		this.encoder.start()
	}

	private endRecording() {
		if (!this.encoder) return

		this.log.info(`Ending recording ${this.currentFilename}`)

		this.encoder.end().then(() => {
			this.log.debug('Encoder ended')
		})

		if (this.encoder.bytesWritten > 1000) {
			this.recordingRepo
				.save({
					start: this.currentStartTime,
					end: new Date(),
					file: this.currentFilename,
					format: this.encoder.format,
				})
				.then((rec) => this.log.debug(rec, `Saving recording`))
		} else {
			this.log.warn(
				`Skipping recording save for ${this.currentFilename} as it does not meet the 1000 bytes written threshold`
			)
			//TODO also delete recording file
		}

		delete this.encoder
	}

	async checkEncoderLoop() {
		//If we hit the no data timeout and the encoder has not been stopped we stop it
		if (
			Date.now() - this.lastReceivedDataTime >
			config.rtp.noDataStopDelay * 1000
		) {
			if (this.encoder) {
				this.endRecording()
			}

			this.isStoppedForNoData = true
		} else if (this.isStoppedForNoData) {
			this.isStoppedForNoData = false
			await this.startNewRecording()
		}
	}

	start() {
		this.startNewRecording()

		this.rtpReceiver.on('data', async (chunk) => {
			this.lastReceivedDataTime = Date.now()

			this.encoder?.write(chunk)
		})

		const segmentLength = config.recordings.segmentTimeMs

		this.log.info(
			`Segment time: ${segmentLength / 1000}s = ${segmentLength}ms`
		)

		setInterval(() => this.checkEncoderLoop(), 250)

		//TODO add cron to restart at certain hours
		setInterval(async () => {
			this.endRecording()
			await this.startNewRecording()
		}, segmentLength)

		this.rtpReceiver.start()
	}
}
