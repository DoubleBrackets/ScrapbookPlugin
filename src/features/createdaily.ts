import { Notice, Plugin, TFile, Vault, WorkspaceLeaf, Modal } from "obsidian";
import ScrapbookPlugin from "src/main";
import { toMonthName } from "src/utils";

export default class CreateDailyScrapbook {
	private plugin: ScrapbookPlugin;

	constructor(plugin: ScrapbookPlugin) {
		this.plugin = plugin;

		// This creates an icon in the left ribbon.
		const ribbonIconEl = plugin.addRibbonIcon(
			"camera",
			"Create Daily Scrapbook",
			(evt: MouseEvent) => {
				try {
					this.CreateScrapbookDirectory(evt);
				} catch (e) {
					new Notice("Error creating daily note: " + e);
				}
			}
		);
	}

	async CreateScrapbookDirectory(mouseEvent: MouseEvent) {
		let vault: Vault = this.plugin.app.vault;
		let date = new Intl.DateTimeFormat().format(new Date());
		console.log(date);
		let year = date.split("/")[2];
		let month = date.split("/")[0];
		let monthName = toMonthName(parseInt(month) - 1);
		let day = date.split("/")[1];

		// Create opinionated directory structure
		let directory = `Scrapbook/${year}/${month} ${monthName}/${day}`;

		if (vault.getFolderByPath(directory) === null) {
			console.log("Creating directory: " + directory);
			await vault.createFolder(directory);
		}

		// read content from the journal template
		let templatePath = this.plugin.options.dailyNoteTemplate + ".md";
		console.log("Template path: " + templatePath);
		let templateFile: TFile = vault.getAbstractFileByPath(
			templatePath
		) as TFile;

		let templateContent = "";
		if (templateFile !== null) {
			templateContent = await vault.cachedRead(templateFile);

			if (month.length === 1) {
				month = `0${month}`;
			}
			let dateProperty = ` ${year}-${month}-${day}`;

			let templateDatePropertyName =
				this.plugin.options.templateDatePropertyName;

			// regex search for the date property and all the text up until a newline
			let datePropertyRegex = new RegExp(
				`${templateDatePropertyName}:.*\n`,
				"g"
			);

			templateContent.replace(
				datePropertyRegex,
				`${templateDatePropertyName}: ${dateProperty}\n`
			);
		}

		// Create journal markdown file
		let filename = `Daily Scrapbook`;
		let mdFilePath = `${directory}/${filename}.md`;

		if (vault.getAbstractFileByPath(mdFilePath) !== null) {
			vault.create(mdFilePath, templateContent);
		}

		let leaf = this.plugin.app.workspace.getMostRecentLeaf();

		if (leaf !== null) {
			let file = vault.getAbstractFileByPath(mdFilePath) as TFile;
			leaf.openFile(file);
		}
	}

	getDailyJournalTemplateText(templateContent: string, date: string): string {
		return templateContent.replace("{{date}}", date);
	}

	onunload(plugin: Plugin): void {}
}
