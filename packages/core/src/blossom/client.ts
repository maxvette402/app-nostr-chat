/**
 * Blossom client (BUD-01/02/03).
 * Uploads and downloads encrypted blobs from a Blossom HTTP server.
 */

export interface BlossomUploadResult {
  url: string;
  sha256: string;
  size: number;
  type: string;
}

export class BlossomClient {
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl.replace(/\/$/, "");
  }

  /**
   * Upload an encrypted file blob.
   * Returns the public URL of the uploaded blob.
   */
  async upload(
    data: ArrayBuffer,
    mimeType: string,
    authHeader?: string
  ): Promise<BlossomUploadResult> {
    const headers: HeadersInit = {
      "Content-Type": mimeType,
    };

    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(`${this.serverUrl}/upload`, {
      method: "PUT",
      headers,
      body: data,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Blossom upload failed: ${response.status} ${text}`);
    }

    return response.json() as Promise<BlossomUploadResult>;
  }

  /** Download a blob by URL. */
  async download(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Blossom download failed: ${response.status}`);
    }
    return response.arrayBuffer();
  }

  /** Check server health. */
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
