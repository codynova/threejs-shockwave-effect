import * as THREE from "three";
import gsap from "gsap";
import viewport from "./utils/viewport";
const picture = require("../assets/coffee.jpg");

export default class webGL {
  constructor({ canvas }) {
    this.scene = new THREE.Scene();

    this.canvas = canvas;

    this.camera = new THREE.OrthographicCamera(
      viewport.width / -2,
      viewport.width / 2,
      viewport.height / 2,
      viewport.height / -2,
      -1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      scene: this.scene,
      alpha: true
    });

    this.renderer.setSize(viewport.width, viewport.height);
    this.renderer.setPixelRatio = viewport.ratio;
    this.renderer.setAnimationLoop(this.render.bind(this));

    this.loadTexture().then(this.init.bind(this));
  }

  init(texture) {
    this.texture = texture;
    const geometry = new THREE.PlaneBufferGeometry(450, 600, 32);
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: {
          value: 0.0
        },
        uTimeWave: {
          value: 0.0
        },
        uMouse: {
          value: new THREE.Vector2()
        },
        uResolution: {
          value: new THREE.Vector2(viewport.width, viewport.height)
        },
        uRatio: {
          value: 450 / 600
        },
        uTexture: {
          value: this.texture
        }
      },
      side: THREE.FrontSide,
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uTimeWave;
        uniform vec2 uMouse;
        uniform float uRatio;
        uniform vec2 uResolution;
        uniform sampler2D uTexture;
        varying vec2 vUv;

        vec3 shockParams = vec3(10.0, 0.7, 0.1);
        float delay = 3.0;

        vec4 getFromColor(vec2 uv){
          return texture2D(uTexture, uv);
        }

        vec2 zoom(vec2 uv, float amount) {
          return 0.5 + ((uv - 0.5) * (1.0-amount));	
        }

        vec2 rotate(vec2 uv, vec2 pivot, float rotation) {
          float sine = sin(rotation);
          float cosine = cos(rotation);
      
          uv -= pivot;
          uv.x = uv.x * cosine - uv.y * sine;
          uv.y = uv.x * sine + uv.y * cosine;
          uv += pivot;
      
          return uv;
      }
      
        vec4 transition(vec2 p) {
          float s = pow(uTime, delay);
          float dist = length((vec2(p) - 0.5) * vec2(uRatio, 1.0));

          if ((dist <= (uTimeWave + shockParams.z)) && (dist >= (uTimeWave - shockParams.z))) {
              float diff = (dist - uTimeWave); 
              float powDiff = 1.0 - pow(abs(diff*shockParams.x), shockParams.y); 
              float diffTime = diff  * powDiff; 
              vec2 diffUV = normalize(p - vec2(.5)); 
              p = p + (diffUV * diffTime);
          }

          vec2 zoom = zoom(p, mix(2., .0, uTime));
          vec2 rotate = rotate(zoom, vec2(0.5), mix(.5, 0., s));

          return mix(
              getFromColor(rotate),
              vec4(1.0, 1.0, 1.0, 1.0),
              step(s, dist)
          );
        }

        void main() {
          vec2 uv = vUv;
          vec2 st = gl_FragCoord.xy / uResolution.xy * uRatio;

          vec4 color = transition(uv);
          
          gl_FragColor = color;
        }
      `
    });

    gsap.to(this.material.uniforms.uTime, {
      value: 1.0,
      duration: 2.5,
      ease: "power4.out"
    });

    const plane = new THREE.Mesh(geometry, this.material);
    this.scene.add(plane);
  }

  loadTexture() {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        picture,
        texture => {
          resolve(texture);
        },
        undefined,
        err => {
          console.error("An error happened.", err);
        }
      );
    });
  }

  render() {
    if (!this.material) return;

    this.time = performance.now() / 100;

    gsap.to(this.material.uniforms.uTimeWave, {
      value: "+=" + 0.025,
      ease: "power3.out"
    });

    this.renderer.render(this.scene, this.camera);
  }
}
