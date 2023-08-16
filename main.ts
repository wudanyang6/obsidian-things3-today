import { exec } from 'child_process';
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
} from 'obsidian';
import { stdout } from 'process';

export const VIEW_TYPE_THINGS3 = "things3-view";

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
		// console.log(this.settings.things3Token)

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'open today list', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('comming soon...');
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		this.registerView(
			VIEW_TYPE_THINGS3,
			(leaf) => new ExampleView(leaf)
		);

		this.addRibbonIcon("dice", "Activate view", () => {
			this.activateThings3View();
		});


	}

	onunload() {

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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: ObsidianThings3;

	constructor(app: App, plugin: ObsidianThings3) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('token')
			.setDesc('The token to send when making requests to the API, otherwise this tool can not modify your todo')
			.addText(text => text
				.setPlaceholder('input token')
				.setValue(this.plugin.settings.things3Token)
				.onChange(async (value) => {
					this.plugin.settings.things3Token = value;
					await this.plugin.saveSettings();
				}));
	}
}


export class ExampleView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_THINGS3;
	}

	getDisplayText() {
		return "Things3";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h4", {text: "Things3"});
        
        // get today List
        const relativePath = this.getAbsolutePath('scpt/things.js')
        console.log(relativePath)
        exec(`osascript ${relativePath} showToDos TMTodayListSource`, (err, stdout, stderr) => {
            const rawHtml = stdout
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawHtml, 'text/html')
            const node = doc.documentElement
            container.appendChild(node)
        })
	}

	async onClose() {
		// Nothing to clean up.
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
        relativePath = `${this.app.vault.configDir}/plugins/obsidian-things3/${fileName}`;
        // absolute path
        return `${basePath}/${relativePath}`;
    }
}
