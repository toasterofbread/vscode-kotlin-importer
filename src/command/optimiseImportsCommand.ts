import * as vscode from 'vscode'
import * as importindex from '../importIndex'
import * as fileimports from "../fileImports"

export async function optimiseImportsCommand(sort_only: boolean = false) {
	const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor
	if (editor === undefined) {
		vscode.window.showInformationMessage("No editor open")
		return
	}

    const index: importindex.Index = {}
    const current_document: vscode.TextDocument = editor.document

    await fileimports.indexFileImports(current_document, index)
    await fileimports.clearFileImports(current_document)

    const imports: string[] = Object.values(index).flatMap((it) => it)
    const optimised_imports: string[] = sort_only ? sortImportLines(imports) : optimiseImportLines(imports)

    for (const import_line of optimised_imports) {
        await fileimports.addImportToFile(current_document, import_line, false)
    }
}

function sortImportLines(lines: string[]): string[] {
    return lines.sort()
}

function optimiseImportLines(lines: string[]): string[] {
    const found_lines: Record<string, boolean> = {}
    const out_lines: string[] = []

    for (const line of lines.map((it) => it.trim())) {
        const line_pkg: string = getImportLinePackage(line)
        if (line_pkg === line) {
            out_lines.push(line)
            continue
        }

        let found: boolean = false
        for (const found_line of Object.keys(found_lines)) {
            const found_pkg: string = getImportLinePackage(found_line)
            if (found_pkg === line_pkg) {
                found_lines[found_line] = true
                found = true
            }
        }

        if (!found) {
            found_lines[line] = false
        }
    }

    for (const line of Object.keys(found_lines)) {
        const multiple: boolean = found_lines[line]
        if (multiple) {
            const pkg: string = getImportLinePackage(line)
            if (pkg == line) {
                out_lines.push(line)
            }
            else {
                out_lines.push(pkg + ".*")
            }
        }
        else {
            out_lines.push(line)
        }
    }

    return sortImportLines(out_lines)
}

function getImportLinePackage(line: string) {
    const last_dot: number = line.lastIndexOf(".")
    if (last_dot === -1) {
        return line
    }
    return line.substring(0, last_dot).trim()
}
