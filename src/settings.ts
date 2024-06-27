import { App, PluginSettingTab, Setting } from "obsidian";
import ScrapbookPlugin from "./main";

export interface ISettings {
	dailyNoteTemplate: string;
	templateDatePropertyName: string;

	// Photos API
	clientId: string;
	clientSecret: string;
	accessToken: string;
	refreshToken: string;
	expires: number;
	port: number;
}

export const DEFAULT_SETTINGS: ISettings = {
	dailyNoteTemplate: "default",
	templateDatePropertyName: "date",

	clientId: "",
	clientSecret: "",
	accessToken: "",
	refreshToken: "",
	expires: 0,
	port: 51894,
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
			.setName("Daily Scrapbook Template Date Property")
			.setDesc("Property name to autofill with current date")
			.addText((text) => {
				text.inputEl.type = "text";
				text.setPlaceholder("Property name");
				text.setValue(this.plugin.options.templateDatePropertyName);
				text.onChange(async (value) => {
					this.plugin.options.templateDatePropertyName = value;
					await this.plugin.writeOptions();
				});
			});

		new Setting(containerEl)
			.setName("Photos API Client ID")
			.setDesc("Client ID for Photos API")
			.addTextArea((text) => {
				text.setPlaceholder("Client ID");
				text.setValue(this.plugin.options.clientId);
				text.onChange(async (value) => {
					this.plugin.options.clientId = value;
					await this.plugin.writeOptions();
				});
			});

		new Setting(containerEl)
			.setName("Photos API Client Secret")
			.setDesc("Client Secret for Photos API")
			.addTextArea((text) => {
				text.setPlaceholder("Client Secret");
				text.setValue(this.plugin.options.clientSecret);
				text.onChange(async (value) => {
					this.plugin.options.clientSecret = value;
					await this.plugin.writeOptions();
				});
			});

		new Setting(containerEl)
			.setName("Photos API Local Port")
			.setDesc("Local http server port for OAuth redirect")
			.addText((text) => {
				text.setPlaceholder("Port number");
				text.setValue(this.plugin.options.port.toString());
				text.onChange(async (value) => {
					this.plugin.options.port = parseInt(value);
					await this.plugin.writeOptions();
				});
			});

		containerEl.createEl("h2", {
			text: "For Oauth on cloud console, use Web Application, and http://localhost:{port number}/google-photos for the redirect URI",
		});
	}
}
