import { Writable } from 'node:stream'
import { dirname, join } from 'node:path'
import { createWriteStream, createReadStream } from 'node:fs'
import { stat, mkdir, unlink } from 'node:fs/promises'
import { Readable } from 'node:stream'
import Store, { ReadStreamOptions } from './Store.js'
import { Logger } from 'pino'
import { getDirRecursive } from '../util/getDirRecursive.js'

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

	createReadStream(
		filename: string,
		options?: ReadStreamOptions
	): Readable {
		return createReadStream(join(this.path, filename), options)
	}

	async createWriteStream(filename: string): Promise<Writable> {
		await this.ensureDirForFile(filename)
		return createWriteStream(join(this.path, filename))
	}

	private async ensureDirForFile(filename: string) {
		const dir = dirname(filename)

		if (dir.length > 0 && dir !== '.') {
			await mkdir(join(this.path, dir), { recursive: true })
		}
	}

	async getDirectoryContents(
		path: string,
		recursive?: boolean | undefined
	): Promise<string[]> {
		return getDirRecursive(path, recursive ? {} : { depth: 0 })
	}

	public async getAllFiles(): Promise<string[]> {
		return this.getDirectoryContents(this.path, true)
	}

	public async deleteFile(filename: string): Promise<void> {
		await unlink(join(this.path, filename))
	}

	async getFileSize(filename: string): Promise<number> {
		return (await stat(join(this.path, filename))).size
	}
}
