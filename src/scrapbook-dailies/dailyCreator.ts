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
import { toDateProperty, toMonthName } from "src/lib/dateformatter";
import axios from "axios";
import {
	GooglePhotosDate,
	GooglePhotosDateFilter,
	GooglePhotosSearchParams,
	dateToGoogleDateFilter,
} from "src/photos-api/photosapi";
import { log } from "console";
import {
	getMediaArtifactName,
	getScrapbookDailyDirectoryPath,
	getScrapbookDailyNotePath,
} from "src/lib/scrapbookPaths";
import { setNoteProperty } from "src/lib/noteUtils";

/**
 * Handles creation of scrapbook dailies
 */
export default class ScrapbookDailyCreator {
	private plugin: ScrapbookPlugin;

	constructor(plugin: ScrapbookPlugin) {
		this.plugin = plugin;
	}

	async createDailyScrapbook(
		date: Date,
		pullImages: boolean = false,
		pullFocus: boolean = false
	) {
		let vault: Vault = this.plugin.app.vault;
		let scrapbookDirectory = getScrapbookDailyDirectoryPath(date);

		await this.createScrapbookDirectory(vault, scrapbookDirectory);

		let templatePath = this.plugin.options.dailyNoteTemplate + ".md";
		let templateText = await this.getDailyJournalTemplateText(
			vault,
			templatePath
		);

		let processedTemplateText = this.processTemplateText(
			templateText,
			date
		);

		let mdFilePath = getScrapbookDailyNotePath(date);

		this.createScrapbookMarkdownFile(
			vault,
			processedTemplateText,
			mdFilePath
		);

		if (pullImages) {
			this.pullImagesFromPhotos(date, vault, scrapbookDirectory);
		}

		if (pullFocus) {
			this.createLeafForDaily(date, vault, mdFilePath);
		}
	}

	async createLeafForDaily(date: Date, vault: Vault, filepath: string) {
		// Pull up focus
		let leaf = this.plugin.app.workspace.getMostRecentLeaf();

		if (leaf !== null) {
			let file = vault.getAbstractFileByPath(filepath) as TFile;
			leaf.openFile(file);
		}
	}

	async pullImagesFromPhotos(date: Date, vault: Vault, directory: string) {
		let photosApi = this.plugin.photosApi;
		let dateFilter: GooglePhotosDateFilter = {
			dates: [dateToGoogleDateFilter(date)],
		};

		let searchParams: GooglePhotosSearchParams = {
			filters: { dateFilter },
		};
		let localSearchParams = Object.assign({}, searchParams);
		let photos = await photosApi.mediaItemsSearch(localSearchParams);

		if (!photos.mediaItems) {
			new Notice("No photos found for " + date.toDateString());
			return;
		}

		let index = 0;
		for (let mediaItem of photos.mediaItems) {
			let mediaUrl = mediaItem.baseUrl;

			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
			if (mediaItem.mimeType.startsWith("video")) {
				mediaUrl = mediaUrl + "=dv";
			}

			console.log("Downloading media: " + mediaUrl);

			let mediaResponse = await requestUrl({ url: mediaUrl });

			let mediaBlob = mediaResponse.arrayBuffer;
			let mediaFileName = getMediaArtifactName(
				mediaItem.filename,
				mediaItem.mimeType.split("/")[0],
				index.toString()
			);
			let mediaFilePath = `${directory}/${mediaFileName}`;

			await vault.createBinary(mediaFilePath, mediaBlob);
			index++;
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

	processTemplateText(templateText: string, date: Date): string {
		let templateDatePropertyName =
			this.plugin.options.templateDatePropertyName;

		setNoteProperty(
			templateText,
			templateDatePropertyName,
			toDateProperty(date)
		);

		return templateText;
	}

	onunload(plugin: Plugin): void {}
}
