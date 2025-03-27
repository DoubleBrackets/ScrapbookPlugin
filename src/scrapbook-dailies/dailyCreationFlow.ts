import {
	Notice,
	Plugin,
	TFile,
	Vault,
	WorkspaceLeaf,
	Modal,
	requestUrl,
	TAbstractFile,
} from "obsidian";
import ScrapbookPlugin from "src/main";
import { toDateProperty, toMonthName } from "src/lib/dateformatter";
import axios from "axios";
import { dir, log } from "console";
import {
	getMediaArtifactName,
	getScrapbookDailyDirectoryPath,
	getScrapbookDailyNotePath,
} from "src/lib/scrapbookPaths";
import { setNoteProperty } from "src/lib/noteUtils";
import PhotosPickerSession, { MediaFile, MediaItemsListResponse, PickedMediaItem } from "src/photos-api/picker-api";
import { CreateDailyModal } from "./createDailyModal";
import { PhotoPickerModal } from "./photoPickerModal";

enum DailyCreatorState {
	/**
	 * Initial state
	 */
	Uninitialized,

	/**
	 * Initial creation modal
	 */
	SettingsModal,

	/**
	 * Waiting for user to pick photos
	 */
	PhotosPicker,
	Done,
	Error
}

/**
 * Handles workflow for creating daily scrapbook entries
 */
export default class ScrapbookDailyCreationFlow {
	private plugin: ScrapbookPlugin;
	private state: DailyCreatorState;

	private mainModal: CreateDailyModal;
	private pickerModal: PhotoPickerModal;

	private photoPickerSession: PhotosPickerSession;


	constructor(plugin: ScrapbookPlugin) {
		this.plugin = plugin;
		this.state = DailyCreatorState.Uninitialized;
	}

	async progressCreationFlow() {
		console.log("Progressing creation flow from state: " + this.state);
		switch (this.state) {
			case DailyCreatorState.Uninitialized:
				try {
					// Open main modal
					this.mainModal = new CreateDailyModal(this.plugin.app, this.plugin, this.onMainModalSubmit.bind(this));
					this.mainModal.open();
					this.state = DailyCreatorState.SettingsModal;
				}
				catch (e) {
					new Notice("Error creating daily note: " + e);
					this.state = DailyCreatorState.Error;
				}
				break;
			case DailyCreatorState.SettingsModal:
				if (this.mainModal.pullImages) {
					// Open photos picker modal
					this.startPhotoPickerSession();
					this.pickerModal = new PhotoPickerModal(this.plugin.app, this.onPickerModalSubmit.bind(this), this.onPickerModalClose.bind(this));
					this.pickerModal.open();
					this.state = DailyCreatorState.PhotosPicker;
				}
				else {
					// No photo picker flow, so just go straight into creation
					await this.createDailyScrapbookRange();
					this.state = DailyCreatorState.Done;
				}
				break;
			case DailyCreatorState.PhotosPicker:
				await this.createDailyScrapbookRange();
				this.state = DailyCreatorState.Done;
				break;
			default:
				break;
		}
	}

	onMainModalSubmit() {
		console.log("Main modal submitted, progressing flow");
		if (this.state === DailyCreatorState.SettingsModal) {
			this.progressCreationFlow();
			this.mainModal.close();
		}
	}

	async onPickerModalSubmit() {
		if (this.state === DailyCreatorState.PhotosPicker) {
			console.log("Picker modal submitted, polling session");
			let pollResult = await this.photoPickerSession.pollCurrentSession();

			if (!pollResult) {
				new Notice("Failed to poll session");
				return false;
			}

			if(!this.photoPickerSession.finishedPicking())
			{
				new Notice("Not finished picking");
				return false;
			}

			let listResult = await this.photoPickerSession.listMediaItems();

			if (!listResult) {
				new Notice("Failed to list media items");
				return false;
			}

			this.progressCreationFlow();
			this.pickerModal.close();
		}
	}

	onPickerModalClose() {
		if (this.state === DailyCreatorState.PhotosPicker) {
			console.log("Picker modal closed, cancelling session");	
			this.photoPickerSession.deleteSession();
			this.state = DailyCreatorState.Done;
		}
	}

	async createDailyScrapbookRange() {
		let createDateRange = this.mainModal.createDateRange;
		let startDate = this.mainModal.startDate;
		let endDate = this.mainModal.endDate;
		let preface = this.mainModal.preface;
		let pullImages = this.mainModal.pullImages;
		let createNote = this.mainModal.createNote;

		if (!createDateRange) {
			endDate = new Date(startDate);
		}

		let limit = 1000;

		// Create dailies for each day in the range
		let currentDate = startDate;
		let pullFocus = false;
		while (currentDate <= endDate && limit-- > 0) {
			let dateCopy = new Date(currentDate);

			this.createSingleDailyScrapbook(
				dateCopy,
				preface,
				pullImages,
				createNote,
				pullFocus,
				createDateRange
			);

			pullFocus = false;
			currentDate.setDate(currentDate.getDate() + 1);
		}
	}

	/**
	 * Create a daily scrapbook entry (or range)
	 * @param date 
	 * @param preface 
	 * @param pullImages Should images be pulled from Google Photos
	 * @param createNote Should a daily markdown note be created
	 * @param pullFocus Should the daily note be focused in the editor 
	 */
	async createSingleDailyScrapbook(
		date: Date,
		preface: string,
		pullImages: boolean = false,
		createNote: boolean = true,
		pullFocus: boolean = false,
		isPartOfRange: boolean = false
	) {
		let vault: Vault = this.plugin.app.vault;
		let scrapbookDirectory = getScrapbookDailyDirectoryPath(date);

		await this.createScrapbookDirectory(vault, scrapbookDirectory);


		let mdFilePath = getScrapbookDailyNotePath(
			this.plugin.options.dailyNoteNamePrefix,
			date
		);

		if (createNote) {
			await this.createDailyScrapNote(vault, date, preface, mdFilePath);
			if (pullFocus) {
				this.createLeafForDaily(date, vault, mdFilePath);
			}
		}

		if (pullImages) {
			await this.downloadPickedMediaItems(date, vault, scrapbookDirectory, isPartOfRange);
		}

		// If the directory is empty, delete it
		let directory = vault.getFolderByPath(scrapbookDirectory);
		if (directory && directory.children.length === 0) {
			console.log("Deleting empty directory: " + scrapbookDirectory);
			await vault.trash(directory as TAbstractFile, true);
		}
	}

	async createDailyScrapNote(vault: Vault, date: Date, preface: string, mdFilePath: string) {
		let templatePath = this.plugin.options.dailyNoteTemplate + ".md";
		let templateText = await this.getDailyJournalTemplateText(
			vault,
			templatePath
		);

		let processedTemplateText = this.processTemplateText(
			templateText,
			preface,
			date
		);

		this.createScrapbookMarkdownFile(
			vault,
			processedTemplateText,
			mdFilePath
		);
	}

	async createLeafForDaily(date: Date, vault: Vault, filepath: string) {
		// Pull up focus
		let leaf = this.plugin.app.workspace.getLeaf("tab");

		if (leaf !== null) {
			let file = vault.getAbstractFileByPath(filepath) as TFile;
			leaf.openFile(file);
		}
	}

	async startPhotoPickerSession() {
		this.photoPickerSession = new PhotosPickerSession(this.plugin.options.oauthAccessToken);

		let createNewSessionResult = await this.photoPickerSession.createNewSession();

		if (!createNewSessionResult) {
			console.log("Failed to create new session");
			new Notice("Failed to create new session");
			this.state = DailyCreatorState.Error;
			return;
		}

		let url = this.photoPickerSession.getPickerUri();

		console.log("Opening picker URL: " + url);

		window.open(url);
	}

	async downloadPickedMediaItems(date: Date, vault: Vault, directory: string, isPartOfRange: boolean) {
		// Media items should already be requested and cached
		let mediaItems = this.photoPickerSession.getPickedMediaItems().mediaItems;

		// Get the media items for the current day
		let pickedMediaItems = mediaItems;
		
		// Only apply date filter if not part of a range
		// So 3am photos don't automatically get grouped into the next day
		// i.e when not in a range, any photos picked automatically get grouped into the current day
		if(isPartOfRange)
		{
			pickedMediaItems = pickedMediaItems.filter((mediaItem) => {
				let mediaDate = new Date(mediaItem.createTime);
				return (
					mediaDate.getFullYear() === date.getFullYear() &&
					mediaDate.getMonth() === date.getMonth() &&
					mediaDate.getDate() === date.getDate()
				);
			});
		}

		// sort in ascending order
		pickedMediaItems = pickedMediaItems.sort((a, b) => {
			let aDate = new Date(a.createTime);
			let bDate = new Date(b.createTime);

			return aDate.getTime() - bDate.getTime();
		});

		await this.downloadMediaFiles(pickedMediaItems, vault, directory);
	}

	/**
	 * Downloads a list of media items to a directory
	 * @param mediaItems 
	 * @param vault 
	 * @param directory 
	 * @returns 
	 */
	async downloadMediaFiles(mediaItems : PickedMediaItem[], vault: Vault, directory: string) {
		
		if (!mediaItems || mediaItems.length === 0) {
			new Notice("No media files provided");
			return;
		}

		let batchCount = 5;
		let currentRequests = [];

		new Notice("Downloading " + mediaItems.length + " media items");

		let index = 0;
		for (let mediaItem of mediaItems) {
			const mediaFile = mediaItem.mediaFile;
			let mediaUrl = mediaFile.baseUrl;
			let mimeType = mediaFile.mimeType;
			let filename = mediaFile.filename;

			let mediaFileName = getMediaArtifactName(
				filename,
				mimeType.split("/")[0],
				index.toString()
			);
			let mediaFilePath = `${directory}/${mediaFileName}`;

			if (vault.getAbstractFileByPath(mediaFilePath) !== null) {
				console.log("Skipping existing media: " + mediaFilePath);
				index++;
				continue;
			}

			let mediaBlob = this.photoPickerSession.loadImage(mediaItem);

			currentRequests.push(mediaBlob);

			mediaBlob.then(async (blob) => {
				await vault.createBinary(mediaFilePath, blob);
			});

			if (currentRequests.length >= batchCount) {
				await Promise.all(currentRequests);
				currentRequests = [];
			}

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

	processTemplateText(
		templateText: string,
		preface: string,
		date: Date
	): string {
		let datePropertyName = this.plugin.options.dailyDatePropertyName;

		let dateCreatedPropertyName =
			this.plugin.options.dailyDateCreatedPropertyName;

		let prefacedPropertyName = this.plugin.options.prefacePropertyName;

		templateText = setNoteProperty(
			templateText,
			datePropertyName,
			toDateProperty(date)
		);

		templateText = setNoteProperty(
			templateText,
			dateCreatedPropertyName,
			toDateProperty(new Date())
		);

		templateText = setNoteProperty(
			templateText,
			prefacedPropertyName,
			preface
		);

		return templateText;
	}

	onunload(plugin: Plugin): void { }
}
