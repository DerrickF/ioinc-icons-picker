import * as vscode from 'vscode';
import axios from 'axios';
import { QuickPickItem } from 'vscode';


export async function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        'extension.pickIcon',
        async () => {
            try {
                const response = await axios.get(
                    'https://ionicons.com/ionicons.json'
                );
                const icons: QuickPickItem[] = response.data.icons.map(
                    (icon: any) => ({
                        label: `${icon.name}`,
                    })
                );

                const pick = await vscode.window.showQuickPick(icons, {
                    placeHolder: 'Pick an icon',
                    matchOnDescription: true,
                    canPickMany: false,
                    title: 'Ionic Icons'
                });

                if (pick) {
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        const snippet = `<ion-icon class="${pick.label}"></ion-icon>`;
                        editor.insertSnippet(new vscode.SnippetString(snippet));
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(
                    'Failed to fetch icons from Ionicons library.'
                );
            }
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}