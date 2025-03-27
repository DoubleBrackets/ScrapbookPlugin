import { App, PluginSettingTab, Setting } from "obsidian";
import ScrapbookPlugin from "./main";

export interface ISettings {
	dailyNoteTemplate: string;
	dailyNoteNamePrefix: string;

	dailyDatePropertyName: string;
	dailyDateCreatedPropertyName: string;
	prefacePropertyName: string;

	// Google API Oauth
	oAuthClientId: string;
	oAuthClientSecret: string;
	
	// oAuth server
	oAuthPort: number;
	oAuthCallbackUrl: string;

	oauthAccessToken: string;
	oauthRefreshToken: string;
	oauthTokenExpirey: number;
}

export const DEFAULT_SETTINGS: ISettings = {
	dailyNoteTemplate: "default",
	dailyNoteNamePrefix: "Scrap Page",

	dailyDatePropertyName: "date",
	dailyDateCreatedPropertyName: "date-created",
	prefacePropertyName: "preface",

	oAuthClientId: "",
	oAuthClientSecret: "",
	oAuthPort: 51894,
	oAuthCallbackUrl: "http://localhost:51894/auth/google/callback",
	oauthAccessToken: "",
	oauthRefreshToken: "",
	oauthTokenExpirey: 0,
};


export class ScrapbookSettingsTab extends PluginSettingTab {
	plugin: ScrapbookPlugin;

	constructor(app: App, plugin: ScrapbookPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Daily Scrapbook Template")
			.setDesc("Template for scrapbook markdown note")
			.addText((text) => {
				text.inputEl.type = "text";
				text.setPlaceholder("Template path");
				text.setValue(this.plugin.options.dailyNoteTemplate);
				text.onChange(async (value) => {
					this.plugin.options.dailyNoteTemplate = value;
					await this.plugin.writeOptions();
				});
			});

		new Setting(containerEl)
			.setName("Daily Scrapbook Note Name Prefix")
			.setDesc("Prefix for daily scrapbook note names")
			.addText((text) => {
				text.inputEl.type = "text";
				text.setPlaceholder("Prefix");
				text.setValue(this.plugin.options.dailyNoteNamePrefix);
				text.onChange(async (value) => {
					this.plugin.options.dailyNoteNamePrefix = value;
					await this.plugin.writeOptions();
				});
			});

		new Setting(containerEl)
			.setName("Scrap Daily Note Date Property Name")
			.setDesc("Property name to autofill with current date")
			.addText((text) => {
				text.inputEl.type = "text";
				text.setPlaceholder("Property name");
				text.setValue(this.plugin.options.dailyDatePropertyName);
				text.onChange(async (value) => {
					this.plugin.options.dailyDatePropertyName = value;
					await this.plugin.writeOptions();
				});
			});

		new Setting(containerEl)
			.setName("Scrap Daily Note Date Created Property Name")
			.setDesc(
				"Property name to autofill with the date the note was created"
			)
			.addText((text) => {
				text.inputEl.type = "text";
				text.setPlaceholder("Property name");
				text.setValue(this.plugin.options.dailyDateCreatedPropertyName);
				text.onChange(async (value) => {
					this.plugin.options.dailyDateCreatedPropertyName = value;
					await this.plugin.writeOptions();
				});
			});

		new Setting(containerEl)
			.setName("Scrap Daily Note Preface Property Name")
			.setDesc("Property name to autofill with the preface")
			.addText((text) => {
				text.inputEl.type = "text";
				text.setPlaceholder("Property name");
				text.setValue(this.plugin.options.prefacePropertyName);
				text.onChange(async (value) => {
					this.plugin.options.prefacePropertyName = value;
					await this.plugin.writeOptions();
				});
			});

		new Setting(containerEl)
			.setName("Photos API Client ID")
			.setDesc("Client ID for Photos API")
			.addTextArea((text) => {
				text.setPlaceholder("Client ID");
				text.setValue(this.plugin.options.oAuthClientId);
				text.onChange(async (value) => {
					this.plugin.options.oAuthClientId = value;
					await this.plugin.writeOptions();
				});
			});

		new Setting(containerEl)
			.setName("Photos API Client Secret")
			.setDesc("Client Secret for Photos API")
			.addTextArea((text) => {
				text.setPlaceholder("Client Secret");
				text.setValue(this.plugin.options.oAuthClientSecret);
				text.onChange(async (value) => {
					this.plugin.options.oAuthClientSecret = value;
					await this.plugin.writeOptions();
				});
			});

		new Setting(containerEl)
			.setName("Photos API Local Port")
			.setDesc("Local http server port for OAuth redirect")
			.addText((text) => {
				text.setPlaceholder("Port number");
				text.setValue(this.plugin.options.oAuthPort.toString());
				text.onChange(async (value) => {
					this.plugin.options.oAuthPort = parseInt(value);
					await this.plugin.writeOptions();
				});
			});

		containerEl.createEl("h2", {
			text: "For Oauth on cloud console, use Web Application, and http://localhost:{port number}/google-photos for the redirect URI",
		});
	}
}
