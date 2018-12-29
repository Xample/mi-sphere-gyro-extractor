import {BoyerMoore} from './BoyerMoore';
import {BlobStreamer, bytes} from './BlobStreamer';

export class BlobSeeker extends BlobStreamer {

  public async seekArrayBufferForward(patternInArray: ArrayBuffer): Promise<boolean> {

    const boyerMoore: BoyerMoore = new BoyerMoore(patternInArray);
    const patternLength: bytes = patternInArray.byteLength;
    const chunkSize: bytes = this.getIdealChunkSize(patternLength);

    while (true) {
      const data: ArrayBuffer = await this.readBlockAsArrayBuffer(chunkSize);

      const patternIndex: bytes = boyerMoore.findIndexIn(data);
      const patternFound: boolean = patternIndex !== -1;

      if (patternFound) {
        // set the offset right after the found pattern
        this.rewind(data.byteLength);
        this.shiftOffset(patternLength);
        this.shiftOffset(patternIndex);
        return true;
      } else {
        if (this.isEndOfBlob()) {
          break;
        }
        // rewind in order to make sure we can still find the whole pattern in one data chunk
        this.rewind(patternLength);
      }
    }
    return false;
  }

  private getIdealChunkSize(bytesLength: bytes) {
    const minimumChunkSize: bytes = bytesLength + 1;
    return Math.ceil(this.defaultChunkSize / minimumChunkSize) * this.defaultChunkSize;
  }

  /**
   * If positive, set the offset from the beginning
   * If negative, set the offset from the end
   * @param {bytes} bytesOffset
   */
  public jumpTo(bytesOffset: bytes): void {
    this.rewind();
    if (bytesOffset > 0){
      this.shiftOffset(bytesOffset)
    }
    else {
      this.shiftOffset(this.getBlobSize());
      const bytesToRewind: number = Math.min(-bytesOffset, this.getBlobSize());
      this.rewind(bytesToRewind);
    }
  }
}
