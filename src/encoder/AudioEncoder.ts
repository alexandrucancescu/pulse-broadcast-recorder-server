import { PassThrough } from 'stream'
import Ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg'
import type { Logger } from 'pino'
import EventEmitter from 'events'
import { Writable } from 'stream'

export type InputFormat = {
	channels?: number
	format: string
	sampleRate: number
	options?: string[]
}

export type OutputFormat = {
	channels?: number
	format: string
	sampleRate?: number
	codec?: string
	options?: string[]
	quality?: string
	bitrate?: number
}

export default class AudioEncoder extends EventEmitter {
	private ffmpeg: FfmpegCommand
	private inputStream: PassThrough
	private readonly outputStream: Writable
	private readonly inputFormat: InputFormat
	public readonly outputFormat: OutputFormat

	private readonly log: Logger

	constructor(
		inputFormat: InputFormat,
		outputFormat: OutputFormat,
		outputStream: Writable,
		log: Logger
	) {
		super()
		this.inputFormat = inputFormat
		this.outputFormat = outputFormat
		this.outputStream = outputStream
		this.log = log
	}

	private createFfmpegCommand() {
		this.inputStream = new PassThrough()

		const inputOptions = [
			'-ac',
			this.inputFormat.channels?.toString() ?? '2',
		]

		const outputOptions = [
			'-ac',
			this.inputFormat.channels?.toString() ?? '2',
		]

		if (this.inputFormat.sampleRate) {
			inputOptions.push(
				'-ar',
				this.inputFormat.sampleRate.toString()
			)
		}

		if (this.outputFormat.bitrate) {
			outputOptions.push('-b:a', `${this.outputFormat.bitrate}k`)
		}

		if (this.outputFormat.sampleRate) {
			outputOptions.push(
				'-ar',
				this.outputFormat.sampleRate?.toString()
			)
		}

		if (this.outputFormat.codec) {
			outputOptions.push('-c:a', this.outputFormat.codec)
		}

		if (this.inputFormat.options) {
			inputOptions.push(...this.inputFormat.options)
		}

		if (this.outputFormat.options) {
			outputOptions.push(...this.outputFormat.options)
		}

		return Ffmpeg(this.inputStream, {})
			.inputFormat(this.inputFormat.format)
			.inputOptions(inputOptions)
			.outputFormat(this.outputFormat.format)
			.outputOptions(outputOptions)
	}

	public start() {
		this.ffmpeg = this.createFfmpegCommand()
			.on('start', (cmd) => this.log.info(`Encoder start: ${cmd}`))
			.on('error', (err) => {
				this.log.error(err, 'FFMPEG encoder error')
				this.emit(err)
			})
			.on('end', () => {
				this.emit('end')
			})

		this.ffmpeg.pipe(this.outputStream)
	}

	public end(): Promise<void> {
		this.ffmpeg.removeAllListeners('end')
		this.ffmpeg.removeAllListeners('error')

		return new Promise((resolve) => {
			let timeout = setTimeout(() => {
				this.log.warn('Killing ffmpeg with SIGKILL')
				this.ffmpeg.kill('SIGKILL')
			}, 1500)

			const endHandler = () => {
				clearTimeout(timeout)
				this.outputStream.end(() => resolve())
			}

			this.ffmpeg.on('end', endHandler)
			this.ffmpeg.on('error', endHandler)

			this.ffmpeg.kill('SIGTERM')
			//FFmpeg does not exit with SIGTERM, need to end stdin
			this.inputStream.end()
		})
	}

	public write(data: Buffer) {
		this.inputStream.write(data)
	}

	public get bitRate(): number {
		return this.outputFormat.bitrate ?? 128
	}

	public get format(): string {
		return this.outputFormat.format
	}
}
