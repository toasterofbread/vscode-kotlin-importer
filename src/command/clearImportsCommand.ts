import * as vscode from 'vscode'
import * as terminalimports from '../terminalImports'
import { clearFileImports } from '../fileImports'

export async function clearImportsCommand() {
	const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor
	if (editor === undefined) {
		vscode.window.showInformationMessage("No editor open")
		return
	}

    const current_document: vscode.TextDocument = editor.document
    await clearFileImports(current_document)
}
