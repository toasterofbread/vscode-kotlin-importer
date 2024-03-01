import * as vscode from 'vscode'
import * as importindex from '../importIndex'
import { addImportToFile } from '../fileImports'

export async function importCommand(index: importindex.Index) {
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
		const word: vscode.Range | undefined = current_document.getWordRangeAtPosition(editor.selection.active)
		if (word !== undefined) {
			keyword = current_document.getText(word)
		}
	}

	if (keyword === undefined || keyword === "") {
		keyword = (await vscode.window.showInputBox())?.trim()
		if (keyword === undefined || keyword === "") {
			return
		}
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
}
