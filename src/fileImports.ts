import * as vscode from 'vscode'
import * as importindex from './importIndex'

// Returns true if import added, false if alreday present in file
export async function addImportToFile(file: vscode.TextDocument, import_line: string): Promise<boolean> {
	const keyword: string = getImportStringKeyword(import_line)!

	// Check if import is already present in file
	const index: importindex.Index = {}
	indexFileImports(file, index, keyword)
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
			closest_import_similarity = similarity
		}
	}

	const insertion_index: number = closest_import_index === -1 ? package_index : closest_import_index
	const prefix: string = closest_import_index === -1 ? "\n" : ""

	const editor: vscode.TextEditor = await vscode.window.showTextDocument(file)
	editor.edit((builder) => {
		builder.insert(
			new vscode.Position(insertion_index + 1, 0),
			prefix + import_line + "\n"
		)
	})

	return true
}

export async function indexFileImports(file: vscode.TextDocument, imports: importindex.Index, keyword: string | null = null) {
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
		if (import_string.startsWith("import ")) {
			return import_string.substring(7)
		}
		return null
	}
	return import_string.substring(last_dot + 1)
}
