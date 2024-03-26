import { Writable } from 'stream'
import Store, { ReadStreamOptions } from './Store'
import { createClient, WebDAVClient } from 'webdav'
import { join } from 'path'
import { Readable } from 'node:stream'

export type WebDavConfig = {
	url: string
	user: string
	password: string
}

export default class WebDavStore implements Store {
	private readonly path: string

	private readonly webDavClient: WebDAVClient

	constructor(path: string, config: WebDavConfig) {
		this.path = path
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
		console.log('created dir', this.path)
		return this
	}

	public createWriteStream(filename: string): Writable {
		return this.webDavClient.createWriteStream(
			join(this.path, filename)
		)
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
