import type Store from './Store.js'
import WebDavStore, { WebDavConfig } from './WebDavStore.js'
import FileStore from './FileStore.js'
import { Logger } from 'pino'

export enum StoreType {
	WebDav = 'webdav',
	File = 'file',
}

type StoreConfig = {
	type: StoreType
	path: string
	webdav?: WebDavConfig
}

export default async function createStore(
	config: StoreConfig,
	log: Logger
): Promise<Store> {
	if (config.type === 'webdav' && !config.webdav) {
		throw new Error(
			'WebDAV store requires store.webdav configuration'
		)
	}

	switch (config.type) {
		case StoreType.WebDav:
			return new WebDavStore(
				config.path,
				config.webdav!,
				log
			).init()
		case StoreType.File:
			return new FileStore(config.path, log).init()
	}
}
