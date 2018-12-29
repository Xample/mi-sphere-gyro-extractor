import * as THREE from 'three';
import {IUniform, Uniform} from 'three';
import {glsl} from '../../../utils/glsl';
import {Shader} from 'three/three-core';

type uniforms = { [uniform: string]: IUniform };

export class Equirectangular2GnomonicShader implements Shader {
  public readonly uniforms: uniforms;
  public readonly vertexShader;
  public readonly fragmentShader;

  private angle: Uniform = new THREE.Uniform(1);

  constructor() {
    this.uniforms = this.getUniforms();
    this.vertexShader = this.getVertexShader();
    this.fragmentShader = this.getFragmentShader();
  }

  private getUniforms(): uniforms {
    return {
      tDiffuse: {value: null},
      angle: this.angle
    }
  }

  private getVertexShader(): string {
    // language=GLSL
    return glsl`
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position =   projectionMatrix *
                        modelViewMatrix *
                        vec4(position,1.0);
    }`;
  }

  private getFragmentShader(): string {
    // language=GLSL
    return glsl`
    uniform sampler2D tDiffuse;
    uniform float angle;
    // [0-1,0-1] with origin on the bottom left
    varying vec2 vUv;

float PI(){
	return 3.141592654; // how do DRY ?
}

vec2 spherical2normalizedEquirectangular(vec2 angles){
	float longitude = angles.x; // -π, +π
	float latitude = angles.y; // -π/2, + π/2
	
	float x = sin(longitude);
	float y = sin(latitude * 2.);
	return vec2(x,y);	
}

vec2 spherical2equirectangular(vec2 angles, vec2 size){
	vec2 normalizedEquirectangular = spherical2normalizedEquirectangular(angles);
	vec2 bottomLeftOrigin = (normalizedEquirectangular + vec2(1, 1)) * 0.5;
	return size * bottomLeftOrigin;
}

// http://blog.nitishmutha.com/equirectangular/360degree/2017/06/12/How-to-project-Equirectangular-image-to-rectilinear-view.html
vec2 gnomonic2spherical(vec2 normalizedCoord){

	float phi1 = 0.;
	float lambda0 = 0.;

	float x = normalizedCoord.x;
	float y = normalizedCoord.y;
	
	float roh = length(normalizedCoord);
	float c = atan(roh);
	
	float cosc = cos(c);
	
	float phi = asin( cosc*sin(phi1) + (y * sin(c) * cos(phi1)) / roh ); 
	
	float lambda = lambda0 + atan( (x * sin(c)) / (roh * cos(phi1) * cosc - y * sin(phi1) * sin(c) ));
	
	return vec2(lambda, phi);
}
    void main() {

	    vec2 imageSize = vec2(2.,1.);
	    vec2 pixelCoord = vUv;
	    vec2 imageCenter = imageSize / 2.0;

	    vec2 normalizedPixelCoord = angle*(pixelCoord - imageCenter) / imageSize.x;

	    vec2 sphericalCoord = gnomonic2spherical(normalizedPixelCoord);
	
	    vec2 sourceCoord = spherical2equirectangular(sphericalCoord, imageSize);
	    gl_FragColor = texture2D(tDiffuse, sourceCoord);
    }
`
  }
}


