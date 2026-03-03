import type { Session } from 'electron';

export class NetworkLayer {
  constructor(
    private readonly browserSession: Session,
    private readonly debug: boolean
  ) {}

  setup() {
    this.browserSession.webRequest.onBeforeRequest((details, callback) => {
      if (this.debug) {
        console.info(
          `[network] ${details.method} ${details.url} (resource=${details.resourceType})`
        );
      }
      callback({ cancel: false });
    });
  }
}

