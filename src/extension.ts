import * as vscode from 'vscode'
import * as importindex from './importIndex'
import { importCommand } from './command/importCommand'
import { importTerminalCommand } from './command/importTerminalCommand'
import { clearImportsCommand } from './command/clearImportsCommand'
import { optimiseImportsCommand } from './command/optimiseImportsCommand'
import { indexFileImports } from './fileImports'

export function activate(context: vscode.ExtensionContext) {
	async function runCommand(command: (index: importindex.Index) => Promise<void>) {
		const index: importindex.Index | undefined = await importindex.getIndex(context)
		if (index === undefined) {
			return
		}
		command.call(undefined, index)
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("vscode-kotlin-importer.import", () => {
			runCommand(importCommand)
		})
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("vscode-kotlin-importer.import-terminal", () => {
			runCommand(importTerminalCommand)
		})
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("vscode-kotlin-importer.optimise-imports", () => {
			optimiseImportsCommand()
		})
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("vscode-kotlin-importer.sort-imports", () => {
			optimiseImportsCommand(true)
		})
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("vscode-kotlin-importer.clear-imports", () => {
			clearImportsCommand()
		})
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("vscode-kotlin-importer.rebuild-index", () => {
			importindex.getIndex(context, true)
		})
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("vscode-kotlin-importer.index-file-imports", async () => {
			const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor
			if (editor === undefined) {
				vscode.window.showInformationMessage("No editor open")
				return
			}

			const index: importindex.Index = {}
			const current_document: vscode.TextDocument = editor.document

			await indexFileImports(current_document, index)

			const added: number = await importindex.addImportsToStoredIndex(context, index)
			vscode.window.showInformationMessage(`${added} new import(s) indexed`)
		})
	)
}
