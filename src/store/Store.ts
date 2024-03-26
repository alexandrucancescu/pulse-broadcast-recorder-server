import { Writable, Readable } from 'node:stream'

export type ReadStreamOptions = {
	start: number
	end: number
}

export default interface Store {
	createWriteStream(filename: string): Writable
	createReadStream(
		filename: string,
		options?: ReadStreamOptions
	): Readable
	init(): Promise<this>
	getFileSize(filename: string): Promise<number>
}
