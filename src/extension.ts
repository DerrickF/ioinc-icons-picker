import * as vscode from 'vscode';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';

let panel: vscode.WebviewPanel | null = null;
let messageListener: vscode.Disposable | null = null;

function svgToBase64(filePath: string) {
    const svg = fs.readFileSync(filePath);
    const base64 = Buffer.from(svg).toString('base64');
    return 'data:image/svg+xml;base64,' + base64;
}

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
                    'https://ionicons.com/ionicons.json'
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

                let t = {}.toString();

                let iconsHtml = '';

                // This is inside your registerCommand callback:
                for (const icon of response.data.icons) {
                    const iconSvgPath = path.join(
                        iconsPath,
                        `${icon.name}.svg`
                    );
                    const iconBase64 = svgToBase64(iconSvgPath); // Here you convert the SVG file to base64
                    iconsHtml += `<li class="icon-item" data-name="${icon.name}"><img src="${iconBase64}" class="icon" /><span>${icon.name}</span></li>`; // And here you use the base64 string as the source for the image
                }

                panel.webview.html = `
                <style>
                    .icon {
                        width: 32px;
                        height: 32px;
                        margin-right: 10px;
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
