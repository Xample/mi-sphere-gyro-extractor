import {BlobSeeker} from '../utils/BlobSeeker';
import {Buffer} from 'buffer';
import {Parser} from 'binary-parser';

export interface orientation {
  x: number;
  y: number;
  z: number;
}

export class MadvAttitude {

  private blob: Blob;
  private blobSeeker: BlobSeeker;
  private imuEntries: Imu[] = [];

  constructor(blob?: Blob) {
    if (blob) {
      this.setBlob(blob).then();
    }
  }

  public clearImuEntries(): void {
    this.imuEntries = [];
  }

  public getEntriesCount(): number {
    return this.imuEntries.length;
  }

  public async setBlob(blob: Blob): Promise<void> {
    this.clearImuEntries();
    this.blob = blob;
    this.blobSeeker = new BlobSeeker(blob);
    this.imuEntries = await this.extractImuEntries();
  }

  public getImuEntry(currentVideoFrame: number): Imu {
    return this.imuEntries[currentVideoFrame] || IMUStruct.emptyImu();
  }

  public getImuEntryAsArray(currentVideoFrame: number): number[] {
    const imu: Imu = this.getImuEntry(currentVideoFrame);
    return [imu.a11, imu.a12, imu.a13, imu.a21, imu.a22, imu.a23, imu.a31, imu.a32, imu.a33];
  }

  public getGimbalOrientation(currentVideoFrame: number): orientation {
    const currentImu: Imu = this.getImuEntry(currentVideoFrame);
    const {a11, a21, a31, a32, a33} = currentImu;

    const hypotenuse: number = Math.sqrt(a32 * a32 + a33 * a33);
    let x: number = Math.atan2(a32, a33);
    const y: number = Math.atan2(-a31, hypotenuse);
    let z: number = -Math.atan2(a21, a11);

    // fix camera specific coordinates
    x = -x;
    z = -z;
    return {x, y, z};
  }

  private async extractImuEntries(): Promise<Imu[]> {
    // this.blobSeeker.jumpTo(-10 *1024 * 1024); // bad workaround to accelerate the imu data location
    if (await this.blobSeeker.seekArrayBufferForward(this.getDataPrefix())) {
      return await this.readIMUEntries(this.blobSeeker);
    }
    else {
      console.log('No data found');
      return [];
    }
  }

  private getDataPrefix(): ArrayBuffer {
    const dataPrefix: Uint8Array = new Uint8Array([0x23, 0xC0, 0x54, 0x74, 0x6C, 0x79, 0x64]);
    return dataPrefix.buffer as ArrayBuffer;
  }

  private async readIMUEntries(fileSeeker: BlobSeeker): Promise<Imu[]> {
    const entries: Imu[] = [];
    const imuBlockSize: number = 9 * 4;
    while (true) {
      const imuData: ArrayBuffer = await fileSeeker.readBlockAsArrayBuffer(imuBlockSize);
      const imuObject: Imu = IMUStruct.Instance.parse(imuData);
      if (!this.isIMUData(imuObject)) {
        break;
      }
      entries.push(this.invertXYAxis(imuObject));
    }
    return entries;
  }

  /**
   * Fix the X and Y vectors as they are reversed… or the Z is reversed… but it's more likely the opposite
   * @param {Imu} entry
   */
  private invertXYAxis(entry: Imu): Imu {
    entry.a11 *= -1;
    entry.a12 *= -1;
    entry.a13 *= -1;
    entry.a21 *= -1;
    entry.a22 *= -1;
    entry.a23 *= -1;
    return entry;
  }

  private isIMUData(imuObject: Imu): boolean {
    const {a11, a12, a13} = imuObject;
    const hypotenuse: number = a11 * a11 + a12 * a12 + a13 * a13;
    const maxAdmitedHypotenuse: number = 2;
    return (hypotenuse !== 0) && (hypotenuse < maxAdmitedHypotenuse)
  }

  private checkHasFileReader(): void {
    if (!this.hasFileReader()) {
      throw new Error('File reader api are not supported');
    }
  }

  private hasFileReader(): boolean {
    const Window = window as any;
    return !!(Window.File && Window.FileReader && Window.FileList && window.Blob);
  }

}

interface Imu {
  a11: number;
  a12: number;
  a13: number;
  a21: number;
  a22: number;
  a23: number;
  a31: number;
  a32: number;
  a33: number;
}

class IMUStruct {
  private static _instance: IMUStruct;
  private parser: Parser;

  private constructor() {
    this.parser = new Parser()
      .floatle('a11')
      .floatle('a12')
      .floatle('a13')
      .floatle('a21')
      .floatle('a22')
      .floatle('a23')
      .floatle('a31')
      .floatle('a32')
      .floatle('a33');
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  static emptyImu(): Imu {
    return {
      a11: 0,
      a12: 0,
      a13: 0,
      a21: 0,
      a22: 0,
      a23: 0,
      a31: 0,
      a32: 0,
      a33: 0
    }
  }

  public parse(data: ArrayBuffer): Imu {
    const buffer: Buffer = Buffer.from(data);
    return this.parser.parse(buffer) as any as Imu;
  }
}
