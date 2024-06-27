import { Plugin, Notice, PluginSettingTab, App, Setting } from "obsidian";
import { DEFAULT_SETTINGS, ISettings, ScrapbookSettingsTab } from "./settings";
import ScrapbookDailyCreator from "./scrapbook-dailies/dailyCreator";
import OAuth from "./photos-api/oauth";
import PhotosApi from "./photos-api/photosapi";
import { CreateDailyModal } from "./scrapbook-dailies/createDailyModal";

export default class ScrapbookPlugin extends Plugin {
	public options: ISettings;

	private createDailyNote: ScrapbookDailyCreator;
	public oauth: OAuth;
	public photosApi: PhotosApi;

	async onload() {
		console.log("loading Scrapbook pluginss");

		await this.setupOptions();

		await this.setupPhotosApi();

		this.setupPluginFeatures();
	}

	onunload() {
		console.log("Unloading Scrapbook plugin");
		this.oauth.httpServer?.close();
	}

	async setupPhotosApi() {
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
	}

	setupPluginFeatures() {
		// Icon for opening the dailies creation modal
		const ribbonIconEl = this.addRibbonIcon(
			"camera",
			"Create Daily Scrapbook",
			(evt: MouseEvent) => {
				try {
					new CreateDailyModal(this.app, this).open();
				} catch (e) {
					new Notice("Error creating daily note: " + e);
				}
			}
		);
	}

	async setupOptions() {
		await this.loadOptions();
		this.addSettingTab(new ScrapbookSettingsTab(this.app, this));
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
