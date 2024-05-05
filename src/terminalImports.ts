import * as vscode from 'vscode'
import * as importindex from './importIndex'

const IMPORT_ERROR_PREFIX: string = "e: file://"
const IMPORT_ERROR_KEYWORD_PREFIX: string = "Unresolved reference"
const IMPORT_ERROR_KEYWORD_PREFIX_GAP: number = 2

// Returns a record of file paths to missing imports
export async function readTerminalImports(): Promise<Record<string, importindex.ImportInfo[]> | null> {
    const terminal_output: string | null = await getTerminalOutput()
    if (terminal_output === null) {
        return null
    }

    return parseGradleOutputMissingImports(terminal_output)
}

// Returns the whole output of the active terminal
async function getTerminalOutput(): Promise<string | null> {
    if (vscode.window.terminals.length == 0) {
        vscode.window.showErrorMessage("No terminals are open")
        return null
    }

    await vscode.commands.executeCommand("workbench.action.terminal.selectAll")
    await vscode.commands.executeCommand("workbench.action.terminal.copySelection")
    await vscode.commands.executeCommand("workbench.action.terminal.clearSelection")

    return await vscode.env.clipboard.readText()
}

// Returns a record of file paths to missing imports
function parseGradleOutputMissingImports(output: string): Record<string, importindex.ImportInfo[]> {
    const missing_imports: Record<string, importindex.ImportInfo[]> = {}

    for (const line of output.split("\n").map((it) => it.trim())) {
        if (!line.startsWith(IMPORT_ERROR_PREFIX)) {
            continue
        }

        const unres_ref_index: number = line.indexOf(IMPORT_ERROR_KEYWORD_PREFIX)
        if (unres_ref_index === -1) {
            continue
        }

        let import_file: string = line.substring(IMPORT_ERROR_PREFIX.length, unres_ref_index - 2)

        const last_colon: number = import_file.lastIndexOf(":")
        const second_last_colon: number = import_file.lastIndexOf(":", last_colon - 1)

        const location_in_file: string = import_file.substring(second_last_colon + 1)
        import_file = import_file.substring(0, second_last_colon)

        let keyword_end_index: number = line.indexOf("'", unres_ref_index + IMPORT_ERROR_KEYWORD_PREFIX.length + IMPORT_ERROR_KEYWORD_PREFIX_GAP)
        if (keyword_end_index === -1) {
            keyword_end_index = line.length
        }

        const import_info: importindex.ImportInfo = {
            keyword: line.substring(unres_ref_index + IMPORT_ERROR_KEYWORD_PREFIX.length + IMPORT_ERROR_KEYWORD_PREFIX_GAP, keyword_end_index).trim(),
            file_path: import_file,
            location_in_file: location_in_file
        }

        const file_missing_imports: importindex.ImportInfo[] | undefined = missing_imports[import_file]
        if (file_missing_imports === undefined) {
            missing_imports[import_file] = [import_info]
        }
        else {
            let already_added: boolean = false
            for (const missing_import of file_missing_imports) {
                if (missing_import.keyword === import_info.keyword) {
                    already_added = true
                    break
                }
            }

            if (!already_added) {
                file_missing_imports.push(import_info)
            }
        }
    }

    return missing_imports
}
