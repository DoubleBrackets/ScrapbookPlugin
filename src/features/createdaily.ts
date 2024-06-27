import {
	Notice,
	Plugin,
	TFile,
	Vault,
	WorkspaceLeaf,
	Modal,
	requestUrl,
} from "obsidian";
import ScrapbookPlugin from "src/main";
import { toMonthName } from "src/lib/utils";
import axios from "axios";
import {
	GooglePhotosDate,
	GooglePhotosDateFilter,
	GooglePhotosSearchParams,
	dateToGoogleDateFilter,
} from "src/photos-api/photosapi";
import { log } from "console";

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
					this.createDailyScrapbook(true);
				} catch (e) {
					new Notice("Error creating daily note: " + e);
				}
			}
		);
	}

	async createDailyScrapbook(pullImages: boolean = false) {
		// Date time parsing
		let vault: Vault = this.plugin.app.vault;
		let date = new Intl.DateTimeFormat().format(new Date());
		console.log(date);
		let year = date.split("/")[2];
		let month = date.split("/")[0];
		let monthName = toMonthName(parseInt(month) - 1);
		let day = date.split("/")[1];

		let scrapbookDirectory = `Scrapbook/${year}/${month} ${monthName}/${day}`;

		await this.createScrapbookDirectory(vault, scrapbookDirectory);

		let templatePath = this.plugin.options.dailyNoteTemplate + ".md";
		let templateText = await this.getDailyJournalTemplateText(
			vault,
			templatePath
		);

		let processedTemplateText = this.processTemplateText(
			templateText,
			year,
			month,
			day
		);

		let mdFilePath = `${scrapbookDirectory}/Scrapbook Entry.md`;
		this.createScrapbookMarkdownFile(
			vault,
			processedTemplateText,
			mdFilePath
		);

		let leaf = this.plugin.app.workspace.getMostRecentLeaf();

		if (leaf !== null) {
			let file = vault.getAbstractFileByPath(mdFilePath) as TFile;
			console.log(leaf);

			leaf.openFile(file);
		}

		if (pullImages) {
			this.pullImagesFromPhotos(vault, scrapbookDirectory);
		}
	}

	async pullImagesFromPhotos(vault: Vault, directory: string) {
		let photosApi = this.plugin.photosApi;
		let dateFilter: GooglePhotosDateFilter = {
			dates: [dateToGoogleDateFilter(new Date())],
		};

		let searchParams: GooglePhotosSearchParams = {
			filters: { dateFilter },
		};
		let localSearchParams = Object.assign({}, searchParams);
		let photos = await photosApi.mediaItemsSearch(localSearchParams);

		console.log(photos);

		for (let mediaItem of photos.mediaItems) {
			let mediaUrl = mediaItem.baseUrl;

			let mediaResponse = await requestUrl({ url: mediaUrl });

			let mediaBlob = mediaResponse.arrayBuffer;
			let mediaFileName = mediaItem.filename;
			let mediaFilePath = `${directory}/${mediaFileName}`;

			await vault.createBinary(mediaFilePath, mediaBlob);
		}
	}

	async createScrapbookDirectory(vault: Vault, path: string) {
		if (vault.getFolderByPath(path) === null) {
			console.log("Creating directory: " + path);
			await vault.createFolder(path);
		}
	}

	async createScrapbookMarkdownFile(
		vault: Vault,
		content: string,
		filepath: string
	) {
		let filename = `Daily Scrapbook`;

		if (vault.getAbstractFileByPath(filepath) === null) {
			vault.create(filepath, content);
		}
	}

	async getDailyJournalTemplateText(
		vault: Vault,
		templateFilepath: string
	): Promise<string> {
		// read content from the journal template
		console.log("Template path: " + templateFilepath);
		let templateFile: TFile = vault.getAbstractFileByPath(
			templateFilepath
		) as TFile;

		return await vault.read(templateFile);
	}

	processTemplateText(
		templateText: string,
		year: string,
		month: string,
		day: string
	): string {
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

		templateText.replace(
			datePropertyRegex,
			`${templateDatePropertyName}: ${dateProperty}\n`
		);

		return templateText;
	}

	onunload(plugin: Plugin): void {}
}
