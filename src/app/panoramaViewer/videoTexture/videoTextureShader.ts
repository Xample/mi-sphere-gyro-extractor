import * as THREE from 'three';
import {IUniform, VideoTexture} from 'three';
import {glsl} from '../../../utils/glsl';
import {Shader} from 'three/three-core';

type uniforms = { [uniform: string]: IUniform & {type:string} };

export class VideoTextureShader implements Shader {
  public readonly uniforms: uniforms;
  public readonly vertexShader;
  public readonly fragmentShader;

  constructor(private videoElement:HTMLVideoElement) {
    this.uniforms = this.getUniforms();
    this.vertexShader = this.getVertexShader();
    this.fragmentShader = this.getFragmentShader();
  }

  private getUniforms(): uniforms {
    return {
      image: {type: 't', value: (this.getVideoTexture())}
    }
  }

  private getVertexShader(): string {
    // language=GLSL
    return glsl`
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix *
                      modelViewMatrix *
                      vec4(position,1.0);
    }`;
  }

  private getFragmentShader(): string {
    // language=GLSL
    return glsl`
    uniform sampler2D image;
    // [0-1,0-1] with origin on the bottom left
    varying vec2 vUv;
    void main() {
	      gl_FragColor = texture2D(image, vUv);
    }
`
  }

  private getVideoTexture(): VideoTexture {
    const texture: VideoTexture = new THREE.VideoTexture(this.getVideoElement());
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;
    return texture;
  }

  private getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }
}


