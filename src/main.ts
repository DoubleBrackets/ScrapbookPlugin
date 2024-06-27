import { Plugin, Notice, PluginSettingTab, App, Setting } from "obsidian";
import { DEFAULT_SETTINGS, ISettings, ScrapbookSettingsTab } from "./settings";
import CreateDailyScrapbook from "./features/createdaily";
import OAuth from "./photos-api/oauth";
import PhotosApi from "./photos-api/photosapi";

export default class ScrapbookPlugin extends Plugin {
	public options: ISettings;

	// Features
	private createDailyNote: CreateDailyScrapbook;
	public oauth: OAuth;
	public photosApi: PhotosApi;

	async onload() {
		console.log("loading Scrapbook pluginss");

		// Setup API
		this.photosApi = new PhotosApi(this);
		this.oauth = new OAuth(this);

		// Protocol handler (for redirecting back to Obsidian after Google OAuth)
		this.registerObsidianProtocolHandler(
			"scrapbook-plugin-google-photos",
			async (data) => {
				if (data.code) {
					console.log(data.code);
					// This is the backup method in case the local HTTP server doesn't work for that user's device
					const res = await this.oauth.processCode(data.code);
					if (res) {
						new Notice("Successfully connected to Google Photos");
					}
				}
			}
		);

		await this.loadOptions();
		this.addSettingTab(new ScrapbookSettingsTab(this.app, this));

		// Setup Features
		this.createDailyNote = new CreateDailyScrapbook(this);
	}

	onunload() {
		console.log("Unloading Scrapbook plugin");
		this.oauth.httpServer?.close();
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
