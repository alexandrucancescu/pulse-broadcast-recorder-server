import { Writable } from 'stream'
import Store, { ReadStreamOptions } from './Store'
import { createClient, FileStat, WebDAVClient } from 'webdav'
import { join, dirname } from 'node:path'
import { Readable } from 'node:stream'
import { Logger } from 'pino'

export type WebDavConfig = {
	url: string
	user: string
	password: string
}

export default class WebDavStore implements Store {
	private readonly path: string
	private readonly log: Logger

	private readonly webDavClient: WebDAVClient

	constructor(path: string, config: WebDavConfig, log: Logger) {
		this.path = path
		this.log = log
		this.webDavClient = createClient(config.url, {
			username: config.user,
			password: config.password ?? process.env['WEBDAV_PASS'],
		})
	}

	async getFileSize(filename: string): Promise<number> {
		return (<any>(
			await this.webDavClient.stat(join(this.path, filename))
		))?.size
	}

	async init() {
		await this.webDavClient.createDirectory(this.path, {
			recursive: true,
		})
		this.log.info(`Created directory ${this.path}`)
		return this
	}

	public async createWriteStream(
		filename: string
	): Promise<Writable> {
		await this.ensureDirForFile(filename)
		return this.webDavClient.createWriteStream(
			join(this.path, filename)
		)
	}

	public async getDirectoryContents(
		path: string,
		recursive: boolean = false
	): Promise<string[]> {
		const fileStats = <FileStat[]>(
			await this.webDavClient.getDirectoryContents(path, {
				deep: recursive,
			})
		)

		return fileStats
			.filter((fs) => fs.type === 'file')
			.map((fs) => fs.filename)
	}

	public async getAllFiles(): Promise<string[]> {
		return this.getDirectoryContents(this.path, true)
	}

	public async deleteFile(filename: string) {
		await this.webDavClient.deleteFile(join(this.path, filename))
	}

	private async ensureDirForFile(filename: string) {
		const dir = dirname(filename)

		if (dir.length > 0 && dir !== '.') {
			await this.webDavClient.createDirectory(
				join(this.path, dir),
				{ recursive: true }
			)
		}
	}

	public createReadStream(
		filename: string,
		options?: ReadStreamOptions
	): Readable {
		return this.webDavClient.createReadStream(
			join(this.path, filename),
			options && {
				range: {
					start: options.start,
					end: options.end,
				},
			}
		)
	}
}
