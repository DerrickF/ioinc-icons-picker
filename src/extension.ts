import * as vscode from 'vscode';
import axios from 'axios';

let panel: vscode.WebviewPanel | null = null;
let messageListener: vscode.Disposable | null = null;

export async function activate(context: vscode.ExtensionContext) {
    
    const disposable = vscode.commands.registerCommand(
        'extension.pickIcon',
        async () => {
            // If the panel already exists, dispose of it.
            if (panel) {
                panel.dispose();
            }

            try {
                const response = await axios.get(
                    'https://ionic.io/ionicons/ionicons.json'
                );

                const iconsPath = context.asAbsolutePath(
                    './node_modules/ionicons/dist/ionicons/svg'
                );

                panel = vscode.window.createWebviewPanel(
                    'iconPicker',
                    'Icon Picker',
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
                    (message) => {
        console.log(`Received message: ${JSON.stringify(message)}`);
                        switch (message.command) {
                            case 'insertIcon':
                                const snippet = `<ion-icon name="${message.name}"></ion-icon>`;
                                const editor = vscode.window.activeTextEditor;
                                console.log(`Inserted snippet: ${snippet}`);
                                if (editor) {
                                    try {
                                        editor.insertSnippet(
                                            new vscode.SnippetString(
                                                `<ion-icon name="${message.name}"></ion-icon>`
                                            )
                                        );
                                        console.log(`Inserted snippet`);
                                    } catch (e) {
                                        console.log(
                                            `Failed to insert snippet: ${e}`
                                        );
                                    }
                                }
                                return;
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

                // This is inside your registerCommand callback:
                for (const icon of response.data.icons) {
                    const icpath = panel.webview.asWebviewUri(vscode.Uri.file(
                        vscode.Uri.joinPath(context.extensionUri, 'node_modules', 'ionicons', 'dist', 'ionicons', 'svg', `${icon.name}.svg`).fsPath
                    ))
                    iconsHtml += `<li class="icon-item" data-name=${icon.name}><ion-icon class="icon" size="small" src="${icpath}"></ion-icon> ${icon.name}</li>`;
                }

                panel.webview.html = `
                <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
                <script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
                <style>
                    body {
                        background-color: #f5f5f5;
                        color: black;
                        list-style: none;
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
                        margin: 10px;
                    }
                </style>
                <input type="text" id="search" placeholder="Search" />
                <ul>${iconsHtml}</ul>
              
                <script>
                    
                    const vscode = acquireVsCodeApi();
                    document.getElementById('search').addEventListener('input', (event) => {
                        const searchTerm = event.target.value.toLowerCase();
                        for (const item of document.querySelectorAll('.icon-item')) {
                            const name = item.dataset.name;
                            item.style.display = name.includes(searchTerm) ? '' : 'none';
                        }
                    });

                    document.addEventListener('click', (event) => {
                        console.log(event);
                        
                        const iconName = event.target.innerText;
                        vscode.postMessage({
                            command: 'insertIcon',
                            name: iconName
                        });

                        console.log(iconName);
                    
                    });
                </script>
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
