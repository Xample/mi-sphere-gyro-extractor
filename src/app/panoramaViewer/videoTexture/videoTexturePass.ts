import {Mesh, PlaneGeometry, ShaderMaterial} from 'three';
import * as THREE from 'three';
import EffectComposer, {CopyShader, RenderPass, ShaderPass, TexturePass} from 'three-effectcomposer-es6';
import {VideoTextureShader} from './videoTextureShader';

export class VideoTexturePass extends RenderPass {

  constructor(private video:HTMLVideoElement, private aspectRatio: number){
    super();
    this.initCamera();
    this.initScene();
  }

  private setScene(scene: THREE.Scene): void {
    (<any>this).scene = scene;
  }

  private setCamera(camera: THREE.OrthographicCamera): void {
    (<any>this).camera = camera;
  }

  private getCamera():THREE.OrthographicCamera {
    return (<any>this).camera as THREE.OrthographicCamera;
  }


  private getPlan(): Mesh {
    // ratio 2 / 1
    const geometry: PlaneGeometry = new THREE.PlaneGeometry(this.getScreenRatio(), 1);
    const material: ShaderMaterial = this.getShaderMaterial();
    return new THREE.Mesh(geometry, material);
  }

  private initScene(): void {
    const scene: THREE.Scene = new THREE.Scene();
    scene.add(this.getCamera());
    scene.add(this.getPlan());
    this.setScene(scene);
  }

  private getScreenRatio(): number {
    return this.aspectRatio;
  }

  private initCamera(): void {
    const frustumEdge: number = .5;
    const aspect: number = this.getScreenRatio();
    const camera = new THREE.OrthographicCamera(-frustumEdge * aspect, frustumEdge * aspect, frustumEdge, -frustumEdge, 0.1, 1000);
    camera.position.set(0, 0, 1);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.setCamera(camera);
  }


  private getShaderMaterial() {
    return new THREE.ShaderMaterial(new VideoTextureShader(this.video));
  }
}
