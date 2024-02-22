import * as vscode from 'vscode'

type ImportIndex = Record<string, string[]>

export function activate(context: vscode.ExtensionContext) {
	let import_command = vscode.commands.registerCommand("vscode-kotlin-importer.import", async () => {
		const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor
		if (editor === undefined) {
			vscode.window.showInformationMessage("No editor open")
			return
		}

		const current_document: vscode.TextDocument = editor.document
		let keyword: string | undefined

		if (!editor.selection.isEmpty) {
			keyword = current_document.getText(editor.selection)
		}
		else {
			keyword = (await vscode.window.showInputBox())?.trim()
		}

		if (keyword === undefined || keyword === "") {
			return
		}

		const index: ImportIndex | undefined = await getIndex(context)
		if (index === undefined) {
			return
		}

		const options: string[] | undefined = index[keyword]
		if (options === undefined || options.length === 0) {
			vscode.window.showInformationMessage(`No imports found for '${keyword}'`)
			return
		}

		let selected: string | undefined
		if (options.length === 1) {
			selected = options[0]
		}
		else {
			selected = await vscode.window.showQuickPick(options)
			if (selected === undefined) {
				return
			}
		}

		const current_file: vscode.TextDocument = await vscode.workspace.openTextDocument(current_document.uri)

		const added: boolean = await addImportToFile(current_file, selected)
		if (!added) {
			vscode.window.showInformationMessage("Import already present in file")
		}
	})
	context.subscriptions.push(import_command)

	let rebuild_index_command = vscode.commands.registerCommand("vscode-kotlin-importer.rebuild-index", () => {
		getIndex(context, true)
	})
	context.subscriptions.push(rebuild_index_command)
}

async function addImportToFile(file: vscode.TextDocument, import_line: string): Promise<boolean> {
	const index: ImportIndex = {}
	const keyword: string = getImportStringKeyword(import_line)!
	readFileImports(file, index, keyword)

	const keyword_imports: string[] | undefined = index[keyword]
	if (keyword_imports?.includes(import_line)) {
		return false
	}

	const import_parts: string[] = import_line.trim().substring(7).split(".")

	let package_index: number = -1
	let closest_import_index: number = -1
	let closest_import_similarity: number = 0

	for (let i = 0; i < file.lineCount; i++) {
		const line: string = file.lineAt(i).text.trim()
		if (!line.startsWith("import ")) {
			if (line.startsWith("package ") && package_index === -1) {
				package_index = i
			}
			continue
		}

		const parts: string[] = line.substring(7).split(".")
		let similarity: number = 0

		for (let j = 0; j < parts.length && j < import_parts.length; j++) {
			if (parts[j] == import_parts[j]) {
				similarity++
			}
			else {
				break
			}
		}

		if (similarity >= closest_import_similarity) {
			closest_import_index = i
		}
	}

	const insertion_index: number = closest_import_index === -1 ? package_index : closest_import_index

	const editor: vscode.TextEditor = await vscode.window.showTextDocument(file)
	editor.edit((builder) => {
		builder.insert(
			new vscode.Position(insertion_index + 1, 0),
			import_line + "\n"
		)
	})

	return true
}

async function getIndex(context: vscode.ExtensionContext, rebuild: boolean = false): Promise<ImportIndex | undefined> {
	let index: ImportIndex | undefined = rebuild ? undefined : context.workspaceState.get("import-index")
	if (index === undefined) {
		index = await buildImportIndex()
		if (index !== undefined) {
			context.workspaceState.update("import-index", index)
		}
	}
	return index
}

async function buildImportIndex(): Promise<ImportIndex | undefined> {
	return await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: "Indexing imports"
	}, async (progress, cancel) => {
		let cancelled: boolean = false
		const index: ImportIndex = await findKotlinKeywordImports(
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

async function readFileImports(file: vscode.TextDocument, imports: ImportIndex, keyword: string | null = null) {
	let in_import_section: boolean = false

	for (let i = 0; i < file.lineCount; i++) {
		const line: vscode.TextLine = file.lineAt(i)
		if (line.isEmptyOrWhitespace || line.text.trimStart().startsWith("//")) {
			continue
		}

		const is_import: boolean = line.text.startsWith("import ")
		if (is_import) {
			in_import_section = true

			const import_keyword: string | null = getImportStringKeyword(line.text)
			if (import_keyword === null || (keyword !== null && import_keyword !== keyword)) {
				continue
			}

			let keyword_imports: string[] | undefined = imports[import_keyword]
			if (keyword_imports === undefined) {
				keyword_imports = []
				imports[import_keyword] = keyword_imports
			}

			if (!keyword_imports.includes(line.text)) {
				keyword_imports.push(line.text)
			}
		}
		else if (in_import_section) {
			break
		}
		else if (!line.text.startsWith("package") && !line.text.startsWith("@")) {
			break
		}
	}
}

function getImportStringKeyword(import_string: string): string | null {
	const last_dot: number = import_string.lastIndexOf(".")
	if (last_dot === -1) {
		return null
	}
	return import_string.substring(last_dot + 1)
}

async function findKotlinKeywordImports(
	keyword: string | null,
	onProgress: (current: number, total: number) => any = () => {},
	isCancelled: () => boolean = () => { return false }
): Promise<ImportIndex> {
	const files: vscode.Uri[] = await vscode.workspace.findFiles("**/*.kt")
	const imports: ImportIndex = {}

	for (const [index, uri] of files.entries()) {
		const file: vscode.TextDocument = await vscode.workspace.openTextDocument(uri)
		readFileImports(file, imports, keyword)

		if (isCancelled()) {
			return imports
		}

		onProgress(index, files.length)
	}

	return imports
}
