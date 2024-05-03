import type { Repository } from 'typeorm'
import type Recording from './entities/Recording'
import type Store from './store/Store'

declare module 'fastify' {
	interface FastifyInstance {
		repository: {
			recordings: Repository<Recording>
		}
		store: Store
	}
}

global {
	interface ImportMeta {
		//Typescript keeps missing this one: import.meta.url
		url: string
	}
}
