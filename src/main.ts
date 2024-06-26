import { Plugin, Notice, PluginSettingTab, App, Setting } from "obsidian";
import { DEFAULT_SETTINGS, ISettings, ScrapbookSettingsTab } from "./settings";
import CreateDailyScrapbook from "./features/createdaily";

export default class ScrapbookPlugin extends Plugin {
	public options: ISettings;

	// Features
	private createDailyNote: CreateDailyScrapbook;

	async onload() {
		console.log("loading Scrapbook pluginss");

		await this.loadOptions();
		this.addSettingTab(new ScrapbookSettingsTab(this.app, this));

		// Setup Features
		this.createDailyNote = new CreateDailyScrapbook(this);
	}

	onunload() {
		console.log("Unloading Scrapbook plugin");
	}

	async loadOptions() {
		// Load the options from the settings file
		let options = await this.loadData();
		this.options = Object.assign({}, DEFAULT_SETTINGS, options);
	}

	async writeOptions() {
		// Save the options to the settings
		await this.saveData(this.options);
	}
}
