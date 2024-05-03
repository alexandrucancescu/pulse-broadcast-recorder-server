import { ConfigType } from '../config'
import Store from '../store/Store.js'
import { Repository } from 'typeorm'
import Recording from '../entities/Recording.js'

//TODO remember delete empty dirs
export async function removeUnlinked(
	store: Store,
	recordingRepo: Repository<Recording>
) {
	const fileNames = await store.getAllFiles()
	const fileNamesSet = new Set(fileNames)

	const entries = await recordingRepo.find()

	const inDbFilenamesSet = new Set(entries.map((entry) => entry.file))

	const notInDb = fileNames.filter((fn) => !inDbFilenamesSet.has(fn))
	const notInStore = entries.filter(
		(entry) => !fileNamesSet.has(entry.file)
	)

	console.log({ notInDb, notInStore })
}

export default function scheduleCleanup(
	config: ConfigType,
	store: Store,
	recordingRepo: Repository<Recording>
) {}
