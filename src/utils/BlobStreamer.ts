export type bytes = number;

export class BlobStreamer {
  protected readonly defaultChunkSize = 64 * 1024; // 64k (more is faster but makes chrome crash on large blobs?!)
  private offset: bytes = 0;

  constructor(private blob: Blob) {
    this.rewind();
  }

  public rewind(bytesLength: bytes = this.offset): void {
    this.shiftOffset(-bytesLength);
  }

  public isEndOfBlob(): boolean {
    return this.offset >= this.getBlobSize();
  }

  public readBlockAsArrayBuffer(length: bytes = this.defaultChunkSize): Promise<ArrayBuffer> {

    const fileReader: FileReader = new FileReader();
    const blob: Blob = this.blob.slice(this.offset, this.offset + length);

    return new Promise<ArrayBuffer>((resolve, reject) => {
      fileReader.onload = (event: Event) => {
        const data = this.getArrayBufferFromEvent(event);
        this.shiftOffset(blob.size);
        resolve(data);
      };

      fileReader.onerror = (event: ErrorEvent) => {
        reject(event.error);
      };

      fileReader.readAsArrayBuffer(blob);
    });
  }

  protected getBlobSize(): number {
    return this.blob.size;
  }

  protected getOffset(): bytes {
    return this.offset;
  }

  protected shiftOffset(bytesRead: bytes): void {
    this.offset += bytesRead;
  }

  protected getArrayBufferFromEvent(event: Event): ArrayBuffer {
    const target: FileReader = (event.target) as FileReader;
    return target.result;
  }

  private getTextFromEvent(event: Event): string {
    const target: FileReader = (event.target) as FileReader;
    return target.result;
  }

  private testEndOfFile(): void {
    if (this.isEndOfBlob()) {
      console.log('Done reading blob');
    }
  }
}

