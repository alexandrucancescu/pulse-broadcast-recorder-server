import { stat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

type Options = {
	ignore?: string[]
	depth?: number
}

export async function getDirRecursive(
	path: string,
	options?: Options
) {
	return innerGetDirRecursive(
		path,
		options?.ignore ?? [],
		options?.depth ?? 10000
	)
}

async function innerGetDirRecursive(
	basePath: string,
	ignore: string[],
	depth: number,
	currentDir: string = '.'
): Promise<string[]> {
	const inDir = (await readdir(join(basePath, currentDir))).filter(
		(absolutePath) =>
			!ignore.some(
				(ignoreRule) =>
					absolutePath === ignoreRule ||
					absolutePath.endsWith(ignoreRule)
			)
	)

	const stats = await Promise.all(
		inDir.map(async (fn) => ({
			fn,
			stat: await stat(join(basePath, currentDir, fn)),
		}))
	)

	const files: string[] = []

	await Promise.all(
		stats.map(async (stat) => {
			if (stat.stat.isFile()) {
				files.push(join(currentDir, stat.fn))
			} else if (stat.stat.isDirectory() && depth > 0) {
				const res = await innerGetDirRecursive(
					basePath,
					ignore,
					depth - 1,
					join(currentDir, stat.fn)
				)
				files.push(...res)
			}
		})
	)

	return files
}
