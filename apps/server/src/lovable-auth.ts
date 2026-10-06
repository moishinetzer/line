import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { auth, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { Config } from "./config.ts";

type SavedAuth = { client?: OAuthClientInformationMixed; tokens?: OAuthTokens; verifier?: string };

// Single local developer account; credentials stay outside Git in .local/.
export class LovableAuth implements OAuthClientProvider {
  readonly redirectUrl: string;
  readonly clientMetadata: OAuthClientMetadata;
  private saved: SavedAuth;
  private readonly path: string;
  private pendingState = "";
  private expiresAt = 0;
  authorizationUrl?: string;

  constructor(private readonly config: Config) {
    this.redirectUrl = `http://localhost:${config.port}/auth/lovable/callback`;
    this.clientMetadata = {
      client_name: "Group Dots Local Hackathon",
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
    this.path = `${config.stateDir}/lovable-auth.json`;
    this.saved = existsSync(this.path) ? JSON.parse(readFileSync(this.path, "utf8")) : {};
  }

  private persist() {
    mkdirSync(this.config.stateDir, { recursive: true, mode: 0o700 });
    writeFileSync(this.path, JSON.stringify(this.saved), { mode: 0o600 });
  }
  clientInformation() { return this.saved.client; }
  saveClientInformation(client: OAuthClientInformationMixed) { this.saved.client = client; this.persist(); }
  tokens() { return this.saved.tokens; }
  saveTokens(tokens: OAuthTokens) { this.saved.tokens = tokens; this.persist(); }
  saveCodeVerifier(verifier: string) { this.saved.verifier = verifier; this.persist(); }
  codeVerifier() {
    if (!this.saved.verifier) throw new Error("Start Lovable login again; PKCE verifier missing");
    return this.saved.verifier;
  }
  state() {
    this.pendingState = randomBytes(32).toString("hex");
    this.expiresAt = Date.now() + 10 * 60_000;
    return this.pendingState;
  }
  redirectToAuthorization(url: URL) { this.authorizationUrl = url.toString(); }
  invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery") {
    if (scope === "all") this.saved = {};
    else if (scope === "client") delete this.saved.client;
    else if (scope === "tokens") delete this.saved.tokens;
    else if (scope === "verifier") delete this.saved.verifier;
    this.persist();
  }

  async login() {
    this.authorizationUrl = undefined;
    const result = await auth(this, { serverUrl: this.config.mcpUrl });
    return result === "AUTHORIZED" ? undefined : this.authorizationUrl;
  }

  async callback(code: string, state: string) {
    const expected = Buffer.from(this.pendingState);
    const supplied = Buffer.from(state);
    if (!code || !expected.length || expected.length !== supplied.length ||
        !timingSafeEqual(expected, supplied) || Date.now() > this.expiresAt) {
      throw new Error("Invalid or expired OAuth state. Start Lovable login again.");
    }
    this.pendingState = "";
    const result = await auth(this, { serverUrl: this.config.mcpUrl, authorizationCode: code });
    if (result !== "AUTHORIZED") throw new Error("Lovable login did not complete; please retry");
  }
}
