import { exec } from 'child_process';
import { clear } from 'console';
import {
    ItemView,
    WorkspaceLeaf,
    App,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    FileSystemAdapter,
    PluginManifest,
} from 'obsidian';
import { resolve } from 'path';
import { stdout } from 'process';

export const VIEW_TYPE_THINGS3 = "things3-today";

interface ObsidianThings3Settings {
    things3Token: string;
}

const DEFAULT_SETTINGS: ObsidianThings3Settings = {
    things3Token: ''
}

export default class ObsidianThings3 extends Plugin {
    settings: ObsidianThings3Settings;

    async onload() {
        await this.loadSettings();

        this.addCommand({
            id: 'open-today',
            name: 'Open Today',
            callback: () => {
                this.activateThings3View();
            }
        });

        this.registerView(
            VIEW_TYPE_THINGS3,
            (leaf) => new ThingsView(leaf, this.manifest)
        );

        this.addRibbonIcon("check-square", "Open Things3 Today", () => {
            this.activateThings3View();
        });

        this.activateThings3View();
    }

    onunload() {
        this.app.workspace
        .getLeavesOfType(VIEW_TYPE_THINGS3)
        .forEach((leaf) => leaf.detach()); 
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }


    async activateThings3View() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_THINGS3);

        await this.app.workspace.getRightLeaf(false).setViewState({
            type: VIEW_TYPE_THINGS3,
            active: true,
        });

        this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(VIEW_TYPE_THINGS3)[0]
        );
    }


}

export class ThingsView extends ItemView {
    intervalValue: NodeJS.Timer;
    refreshTimer: NodeJS.Timer
    manifest: PluginManifest
    
    constructor(leaf: WorkspaceLeaf, manifest: PluginManifest) {
        super(leaf);
        this.manifest = manifest
    }

    getIcon(): string {
        // https://github.com/obsidianmd/obsidian-api/issues/3
        return "check-square";
    }

    getViewType() {
        return VIEW_TYPE_THINGS3;
    }

    getDisplayText() {
        return "Things3 Today";
    }

    async onOpen() {
        this.refreshTodayView(0);
        this.intervalValue = setInterval(() => {
            this.refreshTodayView(0);
        }, 1000 * 30);
    }

    async onClose() {
        // Nothing to clean up.
        clearInterval(this.intervalValue);
        clearTimeout(this.refreshTimer);
    }

    getAbsolutePath(fileName: string): string {
        let basePath;
        let relativePath;
        // base path
        if (this.app.vault.adapter instanceof FileSystemAdapter) {
            basePath = this.app.vault.adapter.getBasePath();
        } else {
            throw new Error('Cannot determine base path.');
        }

        // relative path
        relativePath = `${this.app.vault.configDir}/plugins/${this.manifest.id}/${fileName}`;
        // absolute path
        return `${basePath}/${relativePath}`;
    }

    async getAndShowTodayTodos() {
        const container = this.containerEl.children[1];
        // get today List
        const rawHtml = await this.executeThingsJXA('today')
        const parser = new DOMParser();
        // let cnode = document.createElement('ul').appendChild(document.createElement('ul'))
        // cnode.outerHTML = rawHtml;
        // console.log(cnode)
        const doc = parser.parseFromString(rawHtml, 'text/html')
        const node = doc.documentElement

        container.empty();
        container.createEl("h4", { text: "Things3 Today" });
        container.createEl("a", { href: "things:///show?id=today", text: "Open Today" });
        container.createEl("br");
        container.createEl("br");

        const button = document.createElement("button")
        button.innerText = "Refresh"

        button.addEventListener("click", () => {
            // Notifications will only be displayed if the button is clicked.
            this.refreshTodayView(0, true)
        })

        container.appendChild(button)

        // add click event
        const inputCheckboxes = node.querySelectorAll('.things-today-checkbox');
        inputCheckboxes.forEach((checkbox) => {
            // console.log(checkbox)
            checkbox.addEventListener('click', this.handleCheckboxClick.bind(this));
        });

        // append body > subEle into container
        while (node.children[1].children.length > 0) {
            container.appendChild(node.children[1].children[0]);
        }
    }

    async handleCheckboxClick(event: MouseEvent) {
        const clickedCheckbox = event.target as HTMLInputElement;

        this.executeThingsJXA("complete " + clickedCheckbox.attributes.getNamedItem("tid")?.value)

        clickedCheckbox.parentNode?.detach()

        // things3 is too slow to refresh this immediately
        this.refreshTodayView(3000)
    }

    refreshTodayView(delay?: number, notice = false) {
        clearTimeout(this.refreshTimer)

        this.refreshTimer = setTimeout(() => {
            this.getAndShowTodayTodos();
            console.log("refresh things3 today view, delay: " + delay)
            if (notice) {
                new Notice("Today Refreshed")
            }
        }, delay);
    }

    executeThingsJXA(argv: string): Promise<string> {
        // let output = ''
        const relativePath = this.getAbsolutePath('things.js')

        return new Promise((resolve) => {
            exec(`osascript "${relativePath}" ${argv}`, (err, stdout, stderr) => {
                resolve(stdout)
            })
        })
    }
}
