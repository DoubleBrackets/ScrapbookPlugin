import { requestUrl, RequestUrlParam } from "obsidian";
import ScrapbookPlugin from "src/main";

export type PickingSession = {
    id: string;
    mediaItemsSet: boolean;
    pickerUri: string;
}

export type MediaItemsListResponse = {
    mediaItems: PickedMediaItem[];
    nextPageToken: string;
}

/**
 * https://developers.google.com/photos/picker/reference/rest/v1/mediaItems#Type
 */
enum MediaItemType {
    TYPE_UNSPECIFIED,
    PHOTO,
    VIDEO
}

/**
 * https://developers.google.com/photos/picker/reference/rest/v1/mediaItems#PickedMediaItem
 */
export type PickedMediaItem = {
    id: string;
    createTime: string;
    type: MediaItemType;
    mediaFile: MediaFile;
}

/**
 * https://developers.google.com/photos/picker/reference/rest/v1/mediaItems#MediaFile
 */
export type MediaFile = {
    baseUrl: string;
    mimeType: string;
    filename: string;

    mediaFileMetadata: MediaFileMetadata;
}

/**
 * https://developers.google.com/photos/picker/reference/rest/v1/mediaItems#MediaFileMetadata
 */
export type MediaFileMetadata = {
    width: number;
    height: number;
    cameraMake: string;
    cameraModel: string;

    // Skip photoMetadata and videoMetadata, since we don't need right now
}

enum SessionState {
    NoSession,
    WaitingForPicker,
    ItemsPicked,
    ItemsListed,
}

/**
 *  Type representing a session flow with Google Photos Picker API
 *  https://developers.google.com/photos/picker/reference/rest
 */
export default class PhotosPickerSession {
    accessToken: string;
    currentSession: PickingSession;
    sessionState: SessionState;
    pickedMediaItems: MediaItemsListResponse;

    getPickedMediaItems(): MediaItemsListResponse {
        return this.pickedMediaItems;
    }

    getSessionState(): SessionState {
        return this.sessionState;
    }

    getPickerUri(): string {
        return this.currentSession.pickerUri;
    }

    finishedPicking(): boolean {
        return this.sessionState === SessionState.ItemsPicked || this.sessionState === SessionState.ItemsListed;
    }

    constructor(accessToken: string) {
        this.accessToken = accessToken;
        this.sessionState = SessionState.NoSession;
    }

    /**
     * Make an authenticated request to Google Photos Picker API
     *
     * @param {string} endpoint - Endpoint including the API version: '/v1' etc
     * @param {object} [params] - Optional parameters
     * @returns {Promise<object>}
     *
     * @throws Will throw an error if the input is malformed, or if the user is not authenticated
     */
    async request(
        endpoint: string,
        method: string = "POST",
        params: any = null
    ): Promise<object> {

        const url = "https://photospicker.googleapis.com" + endpoint;
        const body = params == null ? "" : JSON.stringify(params);
        console.log("Requesting: " + url + " with body: " + body);
        const request: RequestUrlParam = {
            url: url,
            method: method,
            headers: {
                Authorization: "Bearer " + this.accessToken,
            },
            contentType: "application/json",
            body: body,
            throw: true
        }

        try {
            // Make the authenticated request to Photos API
            // requestUrl has no CORS restrictions
            // https://forum.obsidian.md/t/make-http-requests-from-plugins/15461/11
            const resp = await requestUrl(request).json;

            console.log("Response: " + JSON.stringify(resp));

            return resp;
        }
        catch (e) {
            throw e;
        }
    }

    /**
     *  Create a new session.
     *  https://developers.google.com/photos/picker/reference/rest/v1/sessions/create
     * @returns 
     */
    async createNewSession(): Promise<boolean> {
        if (this.sessionState !== SessionState.NoSession) {
            return false;
        }

        try {
            let responseData = await this.request("/v1/sessions") as unknown as PickingSession;

            if (responseData) {
                this.currentSession = responseData;
                this.sessionState = SessionState.WaitingForPicker
                return true;
            }
        }
        catch (e) {
            console.log("Error creating session: " + e);
        }

        console.log("Failed creating session");
        return false;
    }

    /**
     * Poll the current session.
     * https://developers.google.com/photos/picker/reference/rest/v1/sessions/get
     */
    async pollCurrentSession(): Promise<boolean> {
        if (this.sessionState != SessionState.WaitingForPicker) {
            return false;
        }

        try {
            let responseData = await this.request(`/v1/sessions/${this.currentSession.id}`, "GET") as unknown as PickingSession;
            if (responseData) {
                this.currentSession = responseData;

                if (this.currentSession.mediaItemsSet) {
                    this.sessionState = SessionState.ItemsPicked;
                }
                return true;
            }
        }
        catch (e) {
            console.log("Error polling session: " + e);
        }

        console.log("Failed polling session");
        return false;
    }

    /**
     * List media items in the current session.
     * https://developers.google.com/photos/picker/reference/rest/v1/mediaItems/list
     * @returns 
     */
    async listMediaItems(): Promise<boolean> {
        if (this.sessionState != SessionState.ItemsPicked) {
            return false;
        }

        try {
            let uri = `/v1/mediaItems`;
            uri += `?sessionId=${this.currentSession.id}`;
            let responseData = await this.request(uri, "GET") as unknown as MediaItemsListResponse;

            if (responseData) {
                this.pickedMediaItems = responseData;
                this.sessionState = SessionState.ItemsListed;
                return true;
            }
        }
        catch (e) {
            console.log("Error listing media items: " + e);
        }

        console.log("Failed listing media items");
        return false;
    }

    /**
     *  Delete the current session.
     *  https://developers.google.com/photos/picker/reference/rest/v1/sessions/delete
     * @returns 
     */
    async deleteSession(): Promise<boolean> {
        if (this.sessionState === SessionState.NoSession) {
            return false;
        }

        try {
            let responseData = await this.request(`/v1/sessions/${this.currentSession.id}`, "DELETE") as any;

            if (responseData) {
                this.sessionState = SessionState.NoSession;
                return true;
            }
        }
        catch (e) {
            console.log("Error deleting session: " + e);
        }

        console.log("Failed deleting session");
        return false;
    }

    /**
     * Load image from URL.
     * https://developers.google.com/photos/library/guides/access-media-items#base-urls
     * @param pickedMediaItem  
     * @returns Media blob as array buffer
     */
    async loadImage(pickedMediaItem : PickedMediaItem) : Promise<ArrayBuffer> {
        const width = pickedMediaItem.mediaFile.mediaFileMetadata.width;
        const height = pickedMediaItem.mediaFile.mediaFileMetadata.height;
        const mimeType = pickedMediaItem.mediaFile.mimeType;

        let baseUrl = pickedMediaItem.mediaFile.baseUrl;

        // Use full size by default
        // const sizeParams = `=w${width}-h${height}`;
        // baseUrl += sizeParams;

        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
        if (mimeType.startsWith("video")) {
            baseUrl = baseUrl + "=dv";
        }

        // Include metadata
        if (mimeType.startsWith("image")) {
            baseUrl = baseUrl + "=d";
        }

        console.log("Requesting media item from baseUrl: " + baseUrl);

        try
        {
            const response = await requestUrl({
                url: baseUrl,
                headers: {
                    Authorization: "Bearer " + this.accessToken,
                },
                throw: true
            });

            return response.arrayBuffer;
        }
        catch (e) {
            console.log("Error requesting media item: " + e);
        }

        return new ArrayBuffer(0);
    }
}