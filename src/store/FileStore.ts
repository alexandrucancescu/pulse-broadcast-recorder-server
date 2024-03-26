import { Writable } from 'node:stream'
import { join } from 'node:path'
import { createWriteStream, createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import Store, { ReadStreamOptions } from './Store.js'

export default class FileStore implements Store {
	private readonly path: string

	constructor(path: string) {
		this.path = path
	}

	async init() {
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
