import { Writable, Readable } from 'node:stream'

export type ReadStreamOptions = {
	start: number
	end: number
}

export default interface Store {
	createWriteStream(filename: string): Promise<Writable>
	createReadStream(
		filename: string,
		options?: ReadStreamOptions
	): Readable
	init(): Promise<this>
	getFileSize(filename: string): Promise<number>
	getDirectoryContents(
		path: string,
		recursive?: boolean
	): Promise<string[]>
	getAllFiles(): Promise<string[]>
	deleteFile(filename: string): Promise<void>
}
