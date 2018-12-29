import {Component, DoCheck, ElementRef, HostListener, Input, OnInit, ViewChild} from '@angular/core';
import {VideoTexturePass} from './videoTexture/videoTexturePass';
import {DualFish2EquirectangularShaderPass} from './dualFish2Equirectangular/dualFish2EquirectangularPass';
import {Equirectangular2gnomonicShaderPass} from './equirectangular2Gnomonic/equirectangular2GnomonicPass';
import EffectComposer, {CopyShader, RenderPass, ShaderPass, TexturePass} from 'three-effectcomposer-es6';
import * as THREE from 'three';
import {Observable} from 'rxjs/Observable';
import {HttpClient} from '@angular/common/http';
import {MadvAttitude, orientation} from '../madvAttitude';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

@Component({
  selector: 'app-image-effect',
  templateUrl: './image-effect.component.html',
  styleUrls: ['./image-effect.component.css']
})
export class ImageEffectComponent implements OnInit, DoCheck {
  @ViewChild('video')
  public video: ElementRef;
  @ViewChild('container')
  public container: ElementRef;
  public orientation: orientation = {x: 0, y: 0, z: 0};
  public fov: number = 195.7;
  public videoSource: SafeResourceUrl;
  private videoURLValue: string;
  private madvAttitude: MadvAttitude = new MadvAttitude();
  private renderer: THREE.WebGLRenderer;
  private composer: THREE.EffectComposer;
  private dualFishPass: DualFish2EquirectangularShaderPass = new DualFish2EquirectangularShaderPass();
  private gnomonicPass: Equirectangular2gnomonicShaderPass = new Equirectangular2gnomonicShaderPass();
  private forceRender: boolean;

  constructor(private httpClient: HttpClient, private domSanitizer: DomSanitizer) {

  }

  get videoURL(): string {
    return this.videoURLValue;
  }

  @Input()
  set videoURL(value: string) {
    if (value) {
      this.videoURLValue = value;
      this.videoSource = this.domSanitizer.bypassSecurityTrustResourceUrl(value);
      this.madvAttitude.clearImuEntries();
      this.getVideoBlob()
        .toPromise()
        .then((blob) => {
          this.madvAttitude.setBlob(blob).then();
        });
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.setFullScreenRenderer();
  }

  public ngDoCheck(): void {
    this.renderNextFrame();
  }

  public onPan($event: HammerInput): void {
    const panSpeed: number = 0.1;
    this.setOrientationX(this.orientation.x + $event.velocityY * panSpeed);
    this.setOrientationZ(this.orientation.z + $event.velocityX * panSpeed);
    this.renderNextFrame();
  }

  public renderNextFrame(): void {
    this.forceRender = true;
  }

  public ngOnInit(): void {
    this.initRenderer();
    this.initComposer();
    this.renderFrame();
  }

  protected getTexturePass() {
    return new VideoTexturePass(this.getVideoElement(), this.getScreenRatio());
  }

  /**
   * Vertical pan
   * @param {number} value
   */
  private setOrientationX(value: number): void {
    this.orientation.x = Math.min(Math.max(value, -Math.PI / 2), Math.PI / 2);
  }

  /**
   * Horizontal pan
   * @param {number} value
   */
  private setOrientationZ(value: number): void {
    // keep a [-PI, PI] range
    this.orientation.z = ((value + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  }

  private getVideoElement(): HTMLVideoElement {
    return this.video.nativeElement;
  }

  private getVideoFPS(): number {
    return this.madvAttitude.getEntriesCount() / this.getVideoElement().duration;
  }

  private getCurrentVideoFrame(): number {
    const magicFPS: number = 29.97; //this.getVideoFPS(); // stupid value…… please get the real one
    return Math.floor(this.getVideoElement().currentTime * magicFPS);
  }

  private renderFrame(): void {
    const forceRender: boolean = this.forceRender;
    if (forceRender || !this.getVideoElement().paused) {
      const currentVideoFrame: number = this.getCurrentVideoFrame();
      const {x, y, z} = this.madvAttitude.getGimbalOrientation(currentVideoFrame);
      this.dualFishPass.setFieldOfView(this.fov);
      this.dualFishPass.setGimbalOrientation(x, y, z);
      this.dualFishPass.setViewOrientation(this.orientation.x, this.orientation.y, this.orientation.z);
      this.composer.render();
      this.forceRender = false;
    }
    requestAnimationFrame(() => this.renderFrame());
  }

  private getVideoBlob(): Observable<Blob> {
    return this.httpClient
      .get(this.videoURLValue, {
        responseType: 'blob'
      });
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer();
    this.setFullScreenRenderer();
    this.getNativeElement().appendChild(this.renderer.domElement);
  }

  private setFullScreenRenderer(): void {
    this.renderer.setSize(this.getScreenSize().width, this.getScreenSize().height);
  }

  private initComposer(): void {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.getTexturePass());
    this.composer.addPass(this.dualFishPass);
    this.gnomonicPass.setRenderToScreen(true);
    this.composer.addPass(this.gnomonicPass);
  }

  private getScreenRatio(): number {
    return this.getScreenSize().width / this.getScreenSize().height;
  }

  private getScreenSize(): { width: number; height: number } {
    const ratio: number = 2;
    const width: number = window.innerWidth;
    const height: number = width / ratio;
    return {
      width,
      height
    };
  }

  private getNativeElement(): HTMLElement {
    return this.container.nativeElement;
  }
}
