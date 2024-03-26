import { Writable } from 'node:stream'
import { join } from 'node:path'
import { createWriteStream, createReadStream } from 'node:fs'
import { stat, mkdir } from 'node:fs/promises'
import { Readable } from 'node:stream'
import Store, { ReadStreamOptions } from './Store.js'
import { Logger } from 'pino'

export default class FileStore implements Store {
	private readonly path: string
	private readonly log: Logger

	constructor(path: string, log: Logger) {
		this.path = path
		this.log = log
	}

	async init(): Promise<this> {
		await mkdir(this.path, { recursive: true })
		return this
	}

	createWriteStream(filename: string): Writable {
		return createWriteStream(join(this.path, filename))
	}

	createReadStream(
		filename: string,
		options?: ReadStreamOptions
	): Readable {
		return createReadStream(join(this.path, filename), options)
	}

	async getFileSize(filename: string): Promise<number> {
		return (await stat(join(this.path, filename))).size
	}
}
