import ScrapbookPlugin from "src/main";
import * as http from "http";
import { Platform, Notice } from "obsidian";

export const onAuthEvent = "authEvent";
export const onClearAuthEvent = "onAuthEvent";

// Need to create a local http server to handle the OAuth2 redirect
// Using OAuth2.0 implicit grant flow (key is in redirect URL)
export default class OAuth2 {
	plugin: ScrapbookPlugin;
	httpServer: http.Server;

	public eventTarget = new EventTarget();

	constructor(plugin: ScrapbookPlugin) {
		this.plugin = plugin;
	}

	async authenticateIfNeeded() {
		// Check to make sure we have a valid access token
		const s = this.plugin.options;
		if (!this.isAuthenticated()) {
			if (!(await this.plugin.oauth.authenticate())) {
				throw new Error("Unauthenticated");
			}
		}
	}

	isAuthenticated(): boolean {
		const options = this.plugin.options;
		return Boolean(options.oauthAccessToken !== "" && Date.now() < options.oauthTokenExpirey);
	}

	async authenticate(): Promise<boolean> {

		const options = this.plugin.options;

		console.log("Attempting to authenticate");

		console.log("Redirect URL: " + options.oAuthCallbackUrl);


		console.log("Refresh Token: " + options.oauthRefreshToken);

		// First attempt to use a stored refresh token
		if (options.oauthRefreshToken) {
			console.log("Google Photos: attempting refresh token");
			if (
				await this.getAccessToken({
					refresh_token: options.oauthRefreshToken,
					client_id: options.oAuthClientId,
					client_secret: options.oAuthClientSecret,
					grant_type: "refresh_token",
				})
			) {
				// Successfully refreshed our access
				this.eventTarget.dispatchEvent(new Event(onAuthEvent));
				return true;
			} else {
				// Refresh token is no longer valid
				console.log("Google Photos: refresh token invalid");
				options.oauthRefreshToken = "";
			}
		}

		// If we can't refresh the access token, launch a full permissions request
		console.log("Google Photos: attempting permissions");
		this.requestPermissions();
		// This is an asynchronous call which is picked up by the httpServer
		// We return false here because there will no auth at this point
		return false;
	}

	requestPermissions() {
		if (Platform.isMobile) {
			// Electron BrowserWindow is not supported on mobile:
			// https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md#nodejs-and-electron-api
			new Notice(
				"You will need to authenticate using a desktop device first before you can use a mobile device."
			);
			return;
		}

		// Check to see if there is already a server running
		if (!this.httpServer) {
			console.log("Starting local auth http server");
			this.httpServer = http
				.createServer(async (req, res) => {
					this.handleAuthResponse(req, res);
				})
				.listen(this.plugin.options.oAuthPort, () => {
					// Start the auth process when the server is ready
					this.startAuthProcess();
				});
		} else {
			// Start the auth process
			this.startAuthProcess();
		}
	}

	/**
	 * Handle the response from the OAuth page
	 * @param req
	 * @param res
	 */
	async handleAuthResponse(
		req: http.IncomingMessage,
		res: http.ServerResponse
	) {
		let options = this.plugin.options;
		console.log("Handling auth response: " + req.url);
		let isCorrectPath = req && req.url && req.url.startsWith("/auth/google/callback");
		console.log("Correct path: " + isCorrectPath);
		if (isCorrectPath) {
			const code =
				new URL(options.oAuthCallbackUrl + (req.url || "")).searchParams.get(
					"code"
				) || "";

			if (await this.processCode(code)) {
				res.end(
					"Authentication successful! Please return to Obsidian."
				);
				this.httpServer.close();
			} else {
				new Notice(
					"❌ Not able to authentication with Google Photos - please try again"
				);
			}
		}
	}

	/**
	 * https://developers.google.com/identity/protocols/oauth2/web-server#httprest_1
	 * Creates a URL and opens it in a new window to start the OAuth2 process (this is making the request to Google)
	 */
	startAuthProcess() {
		let options = this.plugin.options;
		const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
		url.search = new URLSearchParams({
			scope: "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
			include_granted_scopes: "true",
			response_type: "code",
			access_type: "offline",
			state: "state_parameter_passthrough_value",
			redirect_uri: options.oAuthCallbackUrl,
			client_id: options.oAuthClientId,
		}).toString();
		window.open(url.toString());
	}

	/**
	 * Process the code from the OAuth2 response
	 * @param code
	 * @returns
	 */
	async processCode(code: string) {
		let options = this.plugin.options;
		return this.getAccessToken({
			code,
			client_id: options.oAuthClientId,
			client_secret: options.oAuthClientSecret,
			redirect_uri: options.oAuthCallbackUrl,
			grant_type: "authorization_code",
		});
	}

	/**
	 * Exchange the auth code or a refresh token for an access token
	 * @param {object} params - An object of URL query parameters
	 */
	async getAccessToken(params = {}): Promise<boolean> {
		let options = this.plugin.options; 

		console.log("Getting access token with params: " + JSON.stringify(params));

		const url = new URL("https://oauth2.googleapis.com/token");
		url.search = new URLSearchParams(params).toString();

		const res = await fetch(url.href, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		});

		if (res.status === 200) {
			const tokenData = await res.json();

			console.log("Get Access Token Response: " + tokenData);

			options.oauthAccessToken = tokenData.access_token;

			console.log("Received Refresh Token: " + tokenData.refresh_token);

			if (tokenData.refresh_token) {
				options.oauthRefreshToken = tokenData.refresh_token;
			}

			let tokenDurationSeconds = tokenData.expires_in;
			options.oauthTokenExpirey =
				Date.now() + tokenDurationSeconds * 1000;

			await this.plugin.writeOptions();

			this.eventTarget.dispatchEvent(new Event(onAuthEvent));

			return true;
		} else {
			console.error("Failed to get access token from refresh token: " + res.statusText);
			return false;
		}
	}

	clearAuth() {
		let options = this.plugin.options
		console.log("Clearing Google Photos auth");
		options.oauthAccessToken = "";
		options.oauthRefreshToken = "";
		this.eventTarget.dispatchEvent(new Event(onClearAuthEvent));
	}
}
