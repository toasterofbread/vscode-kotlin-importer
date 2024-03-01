import * as vscode from 'vscode'
import * as importindex from '../importIndex'
import * as terminalimports from '../terminalImports'
import { addImportsToFiles } from '../multiFileImport'

export async function importTerminalCommand(index: importindex.Index) {
    const imports: Record<string, importindex.ImportInfo[]> | null = await terminalimports.readTerminalImports()
    if (imports === null) {
        return
    }

    const file_amount: number = Object.keys(imports).length
    if (file_amount === 0) {
        vscode.window.showErrorMessage("No imports found in terminal output")
        return
    }

    await addImportsToFiles(imports, index)
}
