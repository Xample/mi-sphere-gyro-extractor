import * as THREE from 'three';
import {IUniform, Uniform} from 'three';
import {glsl} from '../../../utils/glsl';
import {Shader} from 'three/three-core';

type uniforms = { [uniform: string]: IUniform };

export class DualFish2EquirectangularShader implements Shader {
  public readonly uniforms: uniforms;
  public readonly vertexShader;
  public readonly fragmentShader;

  private viewOrientation: Uniform = new THREE.Uniform(new THREE.Vector3(0, 0, 0));
  private gimbalOrientation: Uniform = new THREE.Uniform(new THREE.Vector3(0, 0, 0));
  private fov: Uniform = new THREE.Uniform(190);

  constructor() {
    this.uniforms = this.getUniforms();
    this.vertexShader = this.getVertexShader();
    this.fragmentShader = this.getFragmentShader();
  }

  private getUniforms(): uniforms {
    return {
      tDiffuse: {value: null},
      viewOrientation: this.viewOrientation,
      gimbalOrientation: this.gimbalOrientation,
      fov: this.fov
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
    uniform vec3 gimbalOrientation;
    uniform vec3 viewOrientation;
    uniform float fov; // FOV of the fisheye, eg: 190 degrees
    // [0-1,0-1] with origin on the bottom left
    varying vec2 vUv;


float PI(){
	return 3.141592654; // how do DRY ?
}

// see http://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/
mat3 rotAxis(vec3 axis, float a) {
	float s=sin(a);
	float c=cos(a);
	float oc=1.0-c;
	vec3 as=axis*s;
	mat3 p=mat3(axis.x*axis,axis.y*axis,axis.z*axis);
	mat3 q=mat3(c,-as.z,as.y,as.z,c,-as.x,-as.y,as.x,c);
	return p*oc+q;
}

vec2 normalizePosition(vec2 point, vec4 box){
     vec2 size = box.ba;
     vec2 origin = box.xy;
     return ((point - origin) / size) -0.5;
}

vec2 denormalizePosition(vec2 normalizedPoint, vec4 box){
     vec2 size = box.ba;
     vec2 origin = vec2(box.x, box.y);
     return (normalizedPoint + 0.5) * size + origin;
}

vec3 plannarToSpherical(vec2 normalizedPoint){
	// This is equirectangular normalized point
	float longitude = 2.0 * PI() * normalizedPoint.x; // -pi to pi
	float latitude = PI() * normalizedPoint.y;	// -pi/2 to pi/2
	vec3 spherical;
	// I tried to adjust to right hand axis standard. Not sure if this should be done in this
	// method… my understanding is the sign of x is wrong at some point (before or after?!)
	spherical.x = -cos(latitude) * cos(longitude);
	spherical.y = cos(latitude) * sin(longitude);
	spherical.z = sin(latitude);
	return spherical;
}

vec2 sphericalToNormalizedFishEye(vec3 spherical, float FOVInDegrees){
	// Calculate fisheye angle and radius
	float hypothenus = sqrt(spherical.x * spherical.x + spherical.z * spherical.z);
	float phi = atan(hypothenus, spherical.y);

	// Pixel in fisheye space
	float FOV = FOVInDegrees / 180.0 * PI(); // FOV of the fisheye, eg: 190 degrees
	float theta = atan(spherical.z,spherical.x);
	float fishX = phi / FOV * cos(theta);
	float fishY = phi / FOV * sin(theta);

	return vec2(fishX, fishY);
}

vec2 normalizedEquirectangular2fish(vec2 normalizedCoodinates, float FOV, mat3 orientation){
	vec3 sphericalCoordinates = plannarToSpherical(normalizedCoodinates);
	// allow to rotate the view the way we want. use orientation = mat3(1.0) for no reorientation.
	sphericalCoordinates *= orientation;
	vec2 normalizedFisheEye = sphericalToNormalizedFishEye(sphericalCoordinates, FOV);
	return normalizedFisheEye;
}

vec2 equirectangular2fish(vec2 pixelCoord, vec4 equirectangularBox, vec4 fishBox, float FOV, mat3 orientation)
{
	vec2 normalizedCoodinates = normalizePosition(pixelCoord, equirectangularBox);
	vec2 normalizedFishCoordinates = normalizedEquirectangular2fish(normalizedCoodinates, FOV, orientation);
	vec2 fishEyePosition = denormalizePosition(normalizedFishCoordinates, fishBox);
	return fishEyePosition;
}

vec4 circleBoxFactory(vec2 center, float radius){
	float edge = radius * 2.;
	return vec4(center - radius, edge, edge);
}

vec2 getBoxCenter(vec4 box){
	return box.xy + (box.ba * 0.5);
}

float getNormalizedDistanceFromCenter(vec2 point, vec4 box){
	vec2 center = getBoxCenter(box);
	vec2 vector = point - center;
	vec2 boxSize = box.ba;

	vec2 normalizedVector = vector / (boxSize / 2.);
	return length(normalizedVector);
}

float getAlpha(vec2 point, vec4 box, float FOV){
 float radius = getNormalizedDistanceFromCenter(point, box);
 float opaqueThresh = 180.0 / FOV; // 180° must be visible
 float transparentThresh = 1.0; // FOV degree… for example 190°
 float dx = opaqueThresh - transparentThresh;
 float slope = 1. / dx;
 float offset = slope * -transparentThresh;
 float alpha = radius * slope + offset;
 float clamped = clamp(alpha, 0.,1.);
 return clamped;
}

vec4 getLeftLensBox(){
    	vec2 center = vec2(0.5, 0.5);
    	float radius = 0.5;
    	vec4 box = circleBoxFactory(center, radius);
    	box.rb /= 2.0;
    	return box ;
}

vec4 getRightLensBox(){
    	vec2 center = vec2(1.5, 0.5);
    	float radius = 0.5;
    	vec4 box = circleBoxFactory(center, radius);
    	box.rb /= 2.0;
    	return box ;
}

vec4 getLeftLensRGBA(sampler2D image, vec2 imageXY, float FOV, mat3 transform){
  vec4 equirectangularBox = vec4(0.,0.,1.,1.);
	vec4 leftFishBox = getLeftLensBox();
		
	vec2 fishEyePosition = equirectangular2fish(imageXY, equirectangularBox, leftFishBox, FOV, transform);
	vec4 color = texture2D(image, fishEyePosition);
	color.a = getAlpha(fishEyePosition, leftFishBox, FOV);
	return color;
}

vec4 getRightLensRGBA(sampler2D image, vec2 imageXY, float FOV, mat3 transform){
  vec4 equirectangularBox = vec4(0.,0.,1.,1.);
	vec4 rightFishBox = getRightLensBox();
	
	mat3 backOrientation = rotAxis(vec3(0.,0.,1.), PI()); // to watch the back lens

	vec2 fishEyePosition = equirectangular2fish(imageXY, equirectangularBox, rightFishBox, FOV, transform * backOrientation);
	vec4 color = texture2D(image, fishEyePosition);
	color.a = getAlpha(fishEyePosition, rightFishBox, FOV);
	return color;
}


mat3 getMatFromEuclidian(vec3 euclidian){
        vec3 xAxis = vec3(1.,0.,0.);
	      vec3 yAxis = vec3(0.,1.,0.);
	      vec3 zAxis = vec3(0.,0.,1.);
      	mat3 orientationTransform = rotAxis(xAxis,euclidian.x);
	      orientationTransform *= rotAxis(yAxis,euclidian.y);
	      orientationTransform *= rotAxis(zAxis,euclidian.z);
        return orientationTransform;
}

mat3 getOrientationTransform(){
        return getMatFromEuclidian(viewOrientation);
}

mat3 getGimbalOrientationTransform(){
        return getMatFromEuclidian(gimbalOrientation * -1.0);
}

void main() {
        mat3 rotationTransform = getOrientationTransform() * getGimbalOrientationTransform();
      	vec4 left = getLeftLensRGBA( tDiffuse, vUv,  fov, rotationTransform);
	      vec4 right = getRightLensRGBA( tDiffuse, vUv,  fov, rotationTransform);
	      // fading… can be improved
	      gl_FragColor = ((left * left.a) + (right * (1.0-left.a)) + (right * right.a) + (left * (1.0-right.a))) * 0.5;
}
`
  }
}


