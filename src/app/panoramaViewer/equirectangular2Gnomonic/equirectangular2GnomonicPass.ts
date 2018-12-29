import {IUniform} from 'three';
import {Equirectangular2GnomonicShader} from './equirectangular2GnomonicShader';
import {ShaderMaterial} from 'three/three-core';
import {ShaderPass} from 'three-effectcomposer-es6';

// For now we make use of ShaderPass (es6) to extend our TS ShaderPass. Best practice would be to have proper typed ShaderPass
export class Equirectangular2gnomonicShaderPass extends ShaderPass {

  constructor(private shader = new Equirectangular2GnomonicShader()) {
    super(shader);
  }

  public setAngle(angle: number): void {
    this.getUniforms().angle.value = angle
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
