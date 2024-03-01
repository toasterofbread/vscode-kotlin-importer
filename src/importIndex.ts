import * as vscode from 'vscode'
import { indexFileImports } from './fileImports'

export type Index = Record<string, string[]>

export interface ImportInfo {
    keyword: string,
    file_path: string,
    location_in_file: string
}

export async function getIndex(context: vscode.ExtensionContext, rebuild: boolean = false): Promise<Index | undefined> {
	let index: Index | undefined = rebuild ? undefined : context.workspaceState.get("import-index")
	if (index === undefined) {
		index = await buildIndex()
		if (index !== undefined) {
			context.workspaceState.update("import-index", index)
		}
	}
	return index
}

async function buildIndex(): Promise<Index | undefined> {
	return await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: "Indexing imports"
	}, async (progress, cancel) => {
		let cancelled: boolean = false
		const index: Index = await findKotlinKeywordImports(
			null,
			(current: number, total: number) => {
				progress.report({ increment: 100 / total, message: `${current} / ${total}` })
			},
			() => {
				if (cancel.isCancellationRequested) {
					cancelled = true
					return true
				}
				return false
			}
		)

		if (cancelled) {
			return undefined
		}

		return index
	})
}

async function findKotlinKeywordImports(
	keyword: string | null,
	onProgress: (current: number, total: number) => any = () => {},
	isCancelled: () => boolean = () => { return false }
): Promise<Index> {
	const files: vscode.Uri[] = await vscode.workspace.findFiles("**/*.kt")
	const imports: Index = {}

	for (const [index, uri] of files.entries()) {
		const file: vscode.TextDocument = await vscode.workspace.openTextDocument(uri)
		indexFileImports(file, imports, keyword)

		if (isCancelled()) {
			return imports
		}

		onProgress(index, files.length)
	}

	return imports
}
