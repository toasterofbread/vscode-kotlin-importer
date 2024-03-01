import * as vscode from 'vscode'
import * as importindex from './importIndex'
import { addImportToFile } from './fileImports'

// Returns the total amount of added imports
export async function addImportsToFiles(file_imports: Record<string, importindex.ImportInfo[]>, index: importindex.Index) {
    let added_imports: number = 0
    let existing_imports: number = 0
    let unindexed_imports: number = 0
    let cancelled_imports: number = 0

    const multiselect_imports: MultiselectImport[] = []

    for (const file_path of Object.keys(file_imports)) {
        const imports: importindex.ImportInfo[] = file_imports[file_path]

        let file: vscode.TextDocument | null = null
        for (const import_info of imports) {
            const indexed_import_lines: string[] | undefined = index[import_info.keyword]
            if (indexed_import_lines === undefined || indexed_import_lines.length === 0) {
                unindexed_imports++
                continue
            }

            if (indexed_import_lines.length > 1) {
                const multiselect_import: MultiselectImport = {
                    info: import_info,
                    import_lines: indexed_import_lines
                }
                multiselect_imports.push(multiselect_import)
                continue
            }

            if (file === null) {
                file = await vscode.workspace.openTextDocument(file_path)
            }

            const added: boolean = await addImportToFile(file, indexed_import_lines[0])
            if (added) {
                added_imports++
            }
            else {
                existing_imports++
            }
        }
    }

    vscode.window.showInformationMessage(`${multiselect_imports.length} imports have multiple matches`)

    for (let i = 0; i < multiselect_imports.length; i++) {
        const multiselect_import: MultiselectImport = multiselect_imports[i]

        const document = await vscode.workspace.openTextDocument(multiselect_import.info.file_path)
        const editor = await vscode.window.showTextDocument(document)

        const line: number = parseInt(multiselect_import.info.location_in_file.split(":")[0])
        let char: number = parseInt(multiselect_import.info.location_in_file.split(":")[1])
        if (isNaN(char)) {
            char = 0
        }

        const range: vscode.Range = new vscode.Range(line, char, line, char)

        await editor.revealRange(range, 1)
        await editor.setDecorations(
            vscode.window.createTextEditorDecorationType({
                isWholeLine: true
            }),
            [range]
        )

        const selected: string | undefined = await vscode.window.showQuickPick(
            multiselect_import.import_lines,
            {
                title: multiselect_import.info.file_path
            }
        )
        if (selected === undefined) {
            cancelled_imports += multiselect_imports.length - i
            break
        }

        const file: vscode.TextDocument = await vscode.workspace.openTextDocument(multiselect_import.info.file_path)
        await addImportToFile(file, selected)
        added_imports++
    }

    vscode.window.showInformationMessage(`Import summary: ${added_imports} added, ${unindexed_imports} unindexed, ${cancelled_imports} cancelled`)
}

interface MultiselectImport {
    info: importindex.ImportInfo
    import_lines: string[]
}
