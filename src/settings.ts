import { App, PluginSettingTab, Setting } from "obsidian";
import ScrapbookPlugin from "./main";

export interface ISettings {
	dailyNoteTemplate: string;
	templateDatePropertyName: string;
}

export const DEFAULT_SETTINGS: ISettings = {
	dailyNoteTemplate: "default",
	templateDatePropertyName: "date",
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
	}
}
