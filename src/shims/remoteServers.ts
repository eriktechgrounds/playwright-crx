// Shim: stubs PlaywrightPipeServer and PlaywrightWebSocketServer for browser builds.
// These are not needed in Chrome extension context and their real implementations
// create a circular dependency with browser.ts that causes TDZ errors in bundles.

export class PlaywrightPipeServer {
  constructor(_browser: any) {}
  async listen(_socketPath: string): Promise<void> {}
  async close(): Promise<void> {}
}

export class PlaywrightWebSocketServer {
  constructor(_browser: any, _path: string) {}
  async listen(_port: number, _host?: string, _path?: string): Promise<string> { return ''; }
  async close(): Promise<void> {}
}
