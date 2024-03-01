import * as vscode from 'vscode'
import * as importindex from './importIndex'
import { importCommand } from './command/importCommand'
import { importTerminalCommand } from './command/importTerminalCommand'

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
		vscode.commands.registerCommand("vscode-kotlin-importer.rebuild-index", () => {
			importindex.getIndex(context, true)
		})
	)
}
