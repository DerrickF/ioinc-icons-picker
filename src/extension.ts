import * as vscode from 'vscode';
import axios from 'axios';

let panel: vscode.WebviewPanel | null = null;
let messageListener: vscode.Disposable | null = null;
let lastActiveEditor: vscode.TextEditor | undefined = undefined;

export interface IconResponse {
    name: string;
    version: string;
    icons: Icon[];
}

export interface Icon {
    name: string;
    tags: string[];
}

export async function activate(context: vscode.ExtensionContext) {
    lastActiveEditor = vscode.window.activeTextEditor;

    const disposable = vscode.commands.registerCommand(
        'extension.pickIcon',
        async () => {
            // If the panel already exists, dispose of it.
            if (panel) {
                panel.dispose();
            }
            let icons: Icon[] | undefined = context.globalState.get('icons');

            try {
                // If the icons aren't cached, fetch them.
                if (!icons) {
                    try {
                        console.log('fetching:', icons);
                        const response = await axios.get(
                            'https://ionic.io/ionicons/ionicons.json'
                        );

                        icons = response.data.icons;

                        // Cache the icons
                        await context.globalState.update('icons', icons);
                    } catch (error) {
                        vscode.window.showErrorMessage(
                            'Failed to fetch icons from Ionicons library.'
                        );
                        return;
                    }
                }
                
                // get the actual image for the icon
                const iconsPath = context.asAbsolutePath(
                    './node_modules/ionicons/dist/ionicons/svg'
                );

                panel = vscode.window.createWebviewPanel(
                    'iconPicker',
                    'Ionic Icons',
                    vscode.ViewColumn.Beside,
                    {
                        enableScripts: true,
                        localResourceRoots: [vscode.Uri.file(iconsPath)],
                    }
                );

                // If a message listener already exists, dispose of it.
                if (messageListener) {
                    messageListener.dispose();
                }

                messageListener = panel.webview.onDidReceiveMessage(
                    async (message) => {

                        if(message.command === 'copyIconName') {
                            vscode.window.showInformationMessage(
                                'copied to clipboard!'
                            );
                        }

                        if(lastActiveEditor) {
                            try {
                                await vscode.env.clipboard.writeText(message.name);
                                await vscode.window.showTextDocument(lastActiveEditor.document, lastActiveEditor.viewColumn);
                            } catch (e) {
                                console.log(`Failed to insert snippet: ${e}`);
                            }
                        }

                        if(panel) {
                            panel.dispose();
                        }
                    },
                    undefined,
                    context.subscriptions
                );

                panel.onDidDispose(
                    () => {
                        if (messageListener) {
                            messageListener.dispose();
                        }
                        panel = null;
                        messageListener = null;
                    },
                    undefined,
                    context.subscriptions
                );

                let iconsHtml = '';
                for (const icon of icons ?? []) {
                    const icpath = panel.webview.asWebviewUri(vscode.Uri.file(
                        vscode.Uri.joinPath(context.extensionUri, 'node_modules', 'ionicons', 'dist', 'ionicons', 'svg', `${icon.name}.svg`).fsPath
                    ))
                    iconsHtml += `<div class="icon-item" tabindex="0" data-name=${icon.name}><ion-icon class="icon" size="small" src="${icpath}"></ion-icon> ${icon.name}</div>`;
                }

                panel.webview.html = `

                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
                        <script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
                    </head>
                    <style>
                        body {
                            background-color: #f5f5f5;
                            color: black;
                            font-family: Arial, sans-serif;
                            max-width: 1000px;
                            margin:0 auto;
                        }

                        input[type="text"] {
                            width: 100%;
                            padding: 12px 20px;
                            margin: 8px 0;
                            box-sizing: border-box;
                            font-size: 16px;
                        }

                        .icon {
                            width: 32px;
                            height: 32px;
                            margin-right: 10px;
                            color: black;
                        }

                        .icon-item {
                            display: flex;
                            align-items: center;
                            cursor: pointer;
                            padding: 10px;
                            margin: 10px 0;
                            background-color: #ffffff;
                            border-radius: 4px;
                            transition: background-color 0.3s ease;
                        }

                        .icon-item:focus {
                            outline: none;
                            background-color: #dddddd;
                        }

                        .icon-item.selected {
                            background-color: #aaffaa;
                            transition: background-color 0.3s ease;
                        }
                    </style>
                    <body>
                        <input type="text" id="search" placeholder="Search"/>
                        <div id="icon-list" class="icon-list">${iconsHtml}</div>
                        <script>
                            window.onload = () => {
                                const vscode = acquireVsCodeApi();
                                const search = document.getElementById('search');
                                const iconList = document.getElementById('icon-list');
                                
                                search.focus();

                                search.addEventListener('input', (event) => {
                                    const searchTerm = event.target.value.toLowerCase();
                                    for (const item of document.querySelectorAll('.icon-item')) {
                                        const name = item.dataset.name;
                                        item.style.display = name.includes(searchTerm) ? '' : 'none';
                                    }
                                });

                                iconList.addEventListener('click', (event) => {
                                    const iconName = event.target.innerText;
                                    vscode.postMessage({
                                        command: 'copyIconName',
                                        name: iconName
                                    });
                                });

                                iconList.addEventListener('keydown', (event) => {
                                    // Capture arrow keys and tab
                                    if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
                                        event.preventDefault();
                                        // Get visible items only
                                        const iconItems = Array.from(iconList.querySelectorAll('.icon-item:not([style*="display: none"])'));
                                        const focusedItem = document.activeElement;
                                        const currentIndex = iconItems.indexOf(focusedItem);

                                        let targetIndex;
                                        switch (event.key) {
                                            case 'ArrowDown':
                                                targetIndex = (currentIndex + 1) % iconItems.length;
                                                break;
                                            case 'ArrowUp':
                                                targetIndex = (currentIndex - 1 + iconItems.length) % iconItems.length;
                                                break;
                                            case 'Enter':
                                                vscode.postMessage({
                                                    command: 'copyIconName',
                                                    name: focusedItem.dataset.name
                                                });
                                                focusedItem.classList.add('selected');
                                                setTimeout(() => {
                                                    focusedItem.classList.remove('selected');
                                                }, 300);
                                                break;
                                        }
                                        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
                                            const targetItem = iconItems[targetIndex];
                                            targetItem.focus();
                                        }
                                    } else if (event.key === 'Tab') {
                                        event.preventDefault();
                                        search.focus();
                                    } else if (!['Shift', 'Control', 'Alt', 'CapsLock'].includes(event.key)) {
                                        // Any other key except modifiers returns focus to the search input
                                        search.focus();
                                    }
                                });
                            };
                        </script>
                    </body>
                </html>
            `;
            } catch (error) {
                vscode.window.showErrorMessage(
                    'Failed to fetch icons from Ionicons library.'
                );
            }
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {
    // Dispose of the panel and message listener when the extension is deactivated.
    if (panel) {
        panel.dispose();
    }
    if (messageListener) {
        messageListener.dispose();
    }
}
