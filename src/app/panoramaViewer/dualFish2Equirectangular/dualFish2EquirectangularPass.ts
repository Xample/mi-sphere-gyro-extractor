import * as THREE from 'three';
import {IUniform} from 'three';
import {DualFish2EquirectangularShader} from './dualFish2EquirectangularShader';
import {ShaderMaterial} from 'three/three-core';
import {ShaderPass} from 'three-effectcomposer-es6';

// For now we make use of ShaderPass (es6) to extend our TS ShaderPass. Best practice would be to have proper typed ShaderPass
export class DualFish2EquirectangularShaderPass extends ShaderPass {

  constructor(private shader = new DualFish2EquirectangularShader()) {
    super(shader);
    this.initUniforms();
  }

  private initUniforms(): void {
    this.setViewOrientation(0, 0, 0);
    this.setGimbalOrientation(0,0,0);
    this.setFieldOfView(190);
  }

  public setViewOrientation(x: number, y: number, z: number): void {
    this.getUniforms().viewOrientation.value = new THREE.Vector3(x, y, z);
  }

  /**
   * The current camera orientation based on the right hand axis standard
   */
  public setGimbalOrientation(x: number, y: number, z: number): void {
    this.getUniforms().gimbalOrientation.value = new THREE.Vector3(x, y, z);
  }

  public setFieldOfView(fov: number): void {
    this.getUniforms().fov.value = fov;
  }


  public setRenderToScreen(value: boolean): void {
    (<any>this).renderToScreen = value;
  }

  private getMaterial(): ShaderMaterial {
    return (<any>this).material;
  }

  private getUniforms(): { [uniform: string]: IUniform } {
    return this.getMaterial().uniforms;
  }
}
