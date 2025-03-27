import { App, ButtonComponent, Modal, Notice, Setting } from "obsidian";
import ScrapbookPlugin from "src/main";
import ScrapbookDailyCreationFlow from "./dailyCreationFlow";
import { onAuthEvent, onClearAuthEvent } from "src/photos-api/oauth";
import { log } from "console";

/**
 * Primary modal wizard for creating a scrapbook daily
 */
export class CreateDailyModal extends Modal {
	plugin: ScrapbookPlugin;
	submitCallback: () => void;

	// Creation wizard settings
	pullImages: boolean = true;
	createNote: boolean = true;
	startDate: Date = new Date();
	endDate: Date = new Date();
	createDateRange: boolean = false;
	preface: string = "No preface (ㆆ _ ㆆ)";

	// Elements
	private endDateSetting: Setting;
	private clearAuthButton: ButtonComponent;

	// Listeners
	updateClearAuthButtonHandler = this.updateClearAuthButton.bind(this);

	constructor(app: App, plugin: ScrapbookPlugin, submitCallback: () => void) {
		super(app);
		this.plugin = plugin;
		this.submitCallback = submitCallback;
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h1", { text: "New Scrapbook Daily" });

		new Setting(contentEl)
			.setName("Pull Media From Google Photos")
			.addToggle((toggle) => {
				toggle.setValue(this.pullImages);
				toggle.onChange((value) => {
					this.pullImages = value;
				});
			});

		new Setting(contentEl)
			.setName("Create Daily Note")
			.addToggle((toggle) => {
				toggle.setValue(this.createNote);
				toggle.onChange((value) => {
					this.createNote = value;
				});
			});

		new Setting(contentEl)
			.setName("Create Date Range")
			.addToggle((toggle) => {
				toggle.setValue(this.createDateRange);
				toggle.onChange((value) => {
					this.createDateRange = value;
					this.endDateSetting.setDisabled(!value);
				});
			});

		new Setting(contentEl).setName("Start Date").addText((text) => {
			text.setPlaceholder("MM/DD/YYYY");
			text.setValue(this.startDate.toLocaleDateString());
			text.onChange((value) => {
				this.startDate = new Date(value);
			});
		});

		this.endDateSetting = new Setting(contentEl)
			.setName("End Date")
			.addText((text) => {
				text.setPlaceholder("MM/DD/YYYY");
				text.setValue(this.endDate.toLocaleDateString());
				text.onChange((value) => {
					this.endDate = new Date(value);
				});
			});

		new Setting(contentEl).setName("Preface").addTextArea((text) => {
			text.setPlaceholder("Preface");
			text.setValue(this.preface);
			text.onChange((value) => {
				this.preface = value;
			});
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.onSubmit();
				})
		).addButton((btn) => {
			btn
				.setButtonText("Clear Auth")
				.setCta()
				.setDisabled(!this.plugin.oauth.isAuthenticated())
				.onClick(() => {
					this.clearAuth();
				})

			this.clearAuthButton = btn;
		});

		this.plugin.oauth.eventTarget.addEventListener(onAuthEvent, this.updateClearAuthButtonHandler);
		this.plugin.oauth.eventTarget.addEventListener(onClearAuthEvent, this.updateClearAuthButtonHandler);
	}

	onClose() {
		this.plugin.oauth.eventTarget.removeEventListener(onAuthEvent, this.updateClearAuthButtonHandler);
		this.plugin.oauth.eventTarget.removeEventListener(onClearAuthEvent, this.updateClearAuthButtonHandler);

		let { contentEl } = this;
		contentEl.empty();
	}

	onSubmit() {
		console.log("Submitting daily creation");

		// Validate date format
		if (isNaN(this.startDate.getTime())) {
			new Notice("Invalid start date");
			return;
		}
		if (isNaN(this.endDate.getTime())) {
			new Notice("Invalid end date");
			return;
		}
		if (this.startDate > this.endDate && this.createDateRange) {
			new Notice("Start date must be before end date");
			return;
		}

		if (this.plugin.oauth.isAuthenticated()) {
			this.submitCallback();
		} else {
			new Notice("Please authenticate with Google Photos first");
			this.plugin.oauth.authenticateIfNeeded();
		}
	}
	clearAuth() {
		new Notice("Clearing google photos auth");
		this.plugin.oauth.clearAuth();
	}

	updateClearAuthButton() {
		console.log("Updating clear auth button");
		this.clearAuthButton.setDisabled(!this.plugin.oauth.isAuthenticated());
	}
}
