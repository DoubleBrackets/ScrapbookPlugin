import ScrapbookPlugin from "src/main";
import * as http from "http";
import { Platform, Notice } from "obsidian";

// Need to create a local http server to handle the OAuth2 redirect
export default class OAuth2 {
	plugin: ScrapbookPlugin;
	port = 51894;
	redirectUrl: string;
	httpServer: http.Server;

	constructor(plugin: ScrapbookPlugin) {
		this.plugin = plugin;

		// Needs to match the redirect URL in the Google Cloud Console
		this.redirectUrl = `http://localhost:${this.port}/google-photos`;
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
		const s = this.plugin.options;
		return Boolean(s.accessToken && Date.now() < s.expires);
	}

	async authenticate(): Promise<boolean> {
		console.log("Attempting to authenticate");

		const s = this.plugin.options;

		// First attempt to use a stored refresh token
		if (s.refreshToken) {
			console.log("Google Photos: attempting refresh token");
			if (
				await this.getAccessToken({
					refresh_token: s.refreshToken,
					client_id: s.clientId,
					client_secret: s.clientSecret,
					grant_type: "refresh_token",
				})
			) {
				// Successfully refreshed our access
				return true;
			} else {
				// Refresh token is no longer valid
				s.refreshToken = "";
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
			this.httpServer = http
				.createServer(async (req, res) => {
					this.handleAuthResponse(req, res);
				})
				.listen(this.port, () => {
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
		console.log("Handling auth response: " + req.url);
		if (req && req?.url?.startsWith("/google-photos")) {
			const code =
				new URL(this.redirectUrl + (req.url || "")).searchParams.get(
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
	 * Creates a URL and opens it in a new window to start the OAuth2 process
	 */
	startAuthProcess() {
		const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
		url.search = new URLSearchParams({
			scope: "https://www.googleapis.com/auth/photoslibrary.readonly",
			include_granted_scopes: "true",
			response_type: "code",
			access_type: "offline",
			state: "state_parameter_passthrough_value",
			redirect_uri: this.redirectUrl,
			client_id: this.plugin.options.clientId,
		}).toString();
		window.open(url.toString());
	}

	/**
	 *
	 * @param code
	 * @returns
	 */
	async processCode(code: string) {
		return this.getAccessToken({
			code,
			client_id: this.plugin.options.clientId,
			client_secret: this.plugin.options.clientSecret,
			redirect_uri: this.redirectUrl,
			grant_type: "authorization_code",
		});
	}

	/**
	 * Exchange the auth code or a refresh token for an access token
	 * @param {object} params - An object of URL query parameters
	 */
	async getAccessToken(params = {}): Promise<boolean> {
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

			this.plugin.options.accessToken = tokenData.access_token;

			if (tokenData.refresh_token) {
				this.plugin.options.refreshToken = tokenData.refresh_token;
			}

			let tokenDurationSeconds = tokenData.expires_in;
			this.plugin.options.expires =
				Date.now() + tokenDurationSeconds * 1000;

			await this.plugin.writeOptions();

			return true;
		} else {
			return false;
		}
	}
}
