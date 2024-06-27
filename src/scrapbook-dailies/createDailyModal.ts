import { App, Modal, Notice, Setting } from "obsidian";
import ScrapbookPlugin from "src/main";
import ScrapbookDailyCreator from "./dailyCreator";

/**
 * Modal wizard for creating a scrapbook daily and pulling images from Google Photos
 */
export class CreateDailyModal extends Modal {
	plugin: ScrapbookPlugin;

	pullImages: boolean = true;
	startDate: Date = new Date();
	endDate: Date = new Date();

	constructor(app: App, plugin: ScrapbookPlugin) {
		super(app);
		this.plugin = plugin;
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

		new Setting(contentEl).setName("Start Date").addText((text) => {
			text.setPlaceholder("MM/DD/YYYY");
			text.setValue(this.startDate.toLocaleDateString());
			text.onChange((value) => {
				this.startDate = new Date(value);
			});
		});

		new Setting(contentEl).setName("End Date").addText((text) => {
			text.setPlaceholder("MM/DD/YYYY");
			text.setValue(this.endDate.toLocaleDateString());
			text.onChange((value) => {
				this.endDate = new Date(value);
			});
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.onSubmit();
				})
		);
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}

	onSubmit() {
		// Validate date format
		if (isNaN(this.startDate.getTime())) {
			new Notice("Invalid start date");
			return;
		}
		if (isNaN(this.endDate.getTime())) {
			new Notice("Invalid end date");
			return;
		}
		if (this.startDate > this.endDate) {
			new Notice("Start date must be before end date");
			return;
		}

		if (this.plugin.oauth.isAuthenticated()) {
			this.close();
			this.createDailies();
		} else {
			new Notice("Please authenticate with Google Photos first");
			this.plugin.oauth.authenticateIfNeeded();
		}
	}

	async createDailies() {
		let scrapbookDailyCreator = new ScrapbookDailyCreator(this.plugin);

		// Create dailies for each day in the range
		let currentDate = this.startDate;
		let pullFocus = true;
		while (currentDate <= this.endDate) {
			let dateCopy = new Date(currentDate);
			scrapbookDailyCreator.createDailyScrapbook(
				dateCopy,
				this.pullImages,
				pullFocus
			);
			pullFocus = false;
			currentDate.setDate(currentDate.getDate() + 1);
		}
	}
}
