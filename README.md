# vscode-kotlin-importer

An simple extension I wrote in an hour or two that quickly adds import lines for Kotlin keywords by keeping an index of existing
imports in the current workspace.

Imports can be added through the context menu action while a keyword is selected, or by triggering the import command and inputting the desired keyword.

If multiple imports are available, a list of options will be shown to select from. If only a single import is found, it will be added automatically.

Imports are inserted below the existing import line that has the closest match to the new import, or otherwise to the bottom of the imports list.
