import { DataSource } from 'typeorm'
import Recording from './entities/Recording.js'
import { DatabaseConfig } from './config'

const createAppDataSource = (config: DatabaseConfig) => {
	return new DataSource({
		//todo configure sync only for dev env
		synchronize: true,
		...config,
		type: config.type,
		entities: [Recording],
		logging: true,
	}).initialize()
}

export default createAppDataSource
