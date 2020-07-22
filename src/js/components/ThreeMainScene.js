import * as THREE from 'three';

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

import { gsap, TimelineLite, Power3, TweenLite } from "gsap";

import lerp from "../utils/lerp"
import "../utils/tween"

import { Sky } from 'three/examples/jsm/objects/Sky.js'

import * as dat from 'dat.gui';
import * as OIMO from 'oimo';
import Hammer from 'hammerjs';

gsap.registerPlugin();

const SETTINGS = {
    cameraPosition : {
        x: 0,
        y: 10,
        z: 30
    },
    directionnalLight: {
        intensity: 1.2
    },
    ambientLight: {
        intensity: 0.5
    },
    material: {
        metalness: 0
    },
    ballPosition: {
        x: -10,
        y: 5,
        z: 0
    },
    sunController: {
        turbidity: 5.,
        rayleigh: 1,
        inclination: 0.2,
        azimuth: 1.772,
    }
}

class ThreeMainScene {
    constructor(models, materials) {
        this._models = models;

        this._canvas = document.querySelector('.js-canvas');

        this._container = document.querySelector('.js-container');

        this._ui = {
        }
        this._setup();

        
        const gui = new dat.GUI();

        let cameraSettings = gui.addFolder('cameraSettings');

        cameraSettings.add(SETTINGS.cameraPosition, 'x').min(0).max(10).step(0.001).onChange(() => this._settingsChangedHandler())
        cameraSettings.add(SETTINGS.cameraPosition, 'y').min(0).max(10).step(0.001).onChange(() => this._settingsChangedHandler())
        cameraSettings.add(SETTINGS.cameraPosition, 'z').min(0).max(10).step(0.001).onChange(() => this._settingsChangedHandler())

    }

    _setup() {
        this._setupValues();

        this._setupHammer();
        this._setupListeners();

        this._setupRenderer();
        
        this._setupPhysics();

        this._setupScene();

        this._animate();
        this._resize();
    }

    _setupValues() {
        // this._time = 0;
        this._launchingBallForce = 0;
        this._ballLaunched = false;

    }

    _setupHammer() {
        this.options = {
            direction: Hammer.DIRECTION_VERTICAL
        }
        this.hammer = new Hammer(this._container, this.options);
        this.hammer.get('pan').set( this.options );
    }

    _setupListeners() {
        window.addEventListener('resize', () => this._resizeHandler());

        this.hammer.on("panstart", (event) => this._panStartHandler(event));
        this.hammer.on("panmove", (event) => this._panMoveHandler(event));
        this.hammer.on("panend", (event) => this._panEndHandler(event));
        this.hammer.on("tap", (event) => this._tapHandler(event));
    }

    _setupRenderer() {
        this._renderer = new THREE.WebGLRenderer({
            canvas: this._canvas,
            antialias: true,
            // alpha: true,
        });

        this._renderer.setPixelRatio(3);
    }

    _setupPhysics() {
        this._oimoWorld = new OIMO.World({ 
            timestep: 1/60, 
            iterations: 8, 
            broadphase: 2, // 1 brute force, 2 sweep and prune, 3 volume tree
            worldscale: 1, // scale full world 
            random: false,  // randomize sample
            info: false,   // calculate statistic or not
            gravity: [0,-9.8,0] 
        });
    }
    
    _setupScene() {
        this._canvasSize = this._canvas.getBoundingClientRect();

        this._scene = new THREE.Scene();
        this._scene.rotation.y = Math.PI *2 - 0.25;
        
        let fogColor = new THREE.Color(0x080808);
        this._scene.background = new THREE.Color( 0xF2CB73 );
        this._scene.fog = new THREE.FogExp2( 0xF2CB73, 0.005 );

        this._camera = new THREE.PerspectiveCamera(60, this._canvasSize.width/ this._canvasSize.height, 1, 5000);
        this._camera.position.set(SETTINGS.cameraPosition.x, SETTINGS.cameraPosition.y, SETTINGS.cameraPosition.z);
        
        // this._controls = new OrbitControls(this._camera, this._canvas);

        this._setupSceneObjects();
    }


    _setupSceneObjects() {
        // this._skyProperties();
        
        this._setupObstacles();
        this._setupGround();
        this._setupTargetBox();
        this._setupBall();
        this._setupBallStick();
        this._setupStickHole();
        this._setupTrees();
        this._setupLights();
    }

    _setupGround() {
        let geometry = new THREE.PlaneBufferGeometry( 5000, 5000, 32 );
        let material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
        this._ground = new THREE.Mesh( geometry, material );
        this._ground.rotation.x = Math.PI / 2
        this._scene.add( this._ground );
    }

    _skyProperties() {
        this.sky = new Sky();
        this.sunSphere = new THREE.Mesh(
            new THREE.SphereBufferGeometry(20000, 16, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        this.skyUniforms = this.sky.material.uniforms;
        this._scene.add(this.sunSphere, this.sky);
    }

    _skyColor() {
        this.sky.scale.setScalar(450000);
        this.sunSphere.position.x = 40000 * Math.cos(-SETTINGS.sunController.azimuth);
        this.sunSphere.position.y = 40000 * Math.sin(-SETTINGS.sunController.azimuth) * Math.sin(-SETTINGS.sunController.inclination);
        this.sunSphere.position.z = 40000 * Math.sin(-SETTINGS.sunController.azimuth) * Math.cos(-SETTINGS.sunController.inclination);
        this.sunSphere.visible = SETTINGS.sunController.sun;
        this.skyUniforms["sunPosition"].value.copy(this.sunSphere.position);
        this.skyUniforms["turbidity"].value = SETTINGS.sunController.turbidity
        this.skyUniforms["rayleigh"].value = SETTINGS.sunController.rayleigh

    }

    _setupTargetBox() {
        let geometry = new THREE.BoxGeometry( 10, 100, 10 );
        let material = new THREE.MeshBasicMaterial( {color: 0x808080, vertexColors: THREE.FaceColors} );
        this._targetBox = new THREE.Mesh( geometry, material );

        this._targetBox.geometry.faces[ 8 ].color.setHex( 0x808000 );
        this._targetBox.geometry.faces[ 9 ].color.setHex( 0x808000 ); 

        this._targetBox.position.set(0, 50, 0)
        this._scene.add( this._targetBox );
    }

    _setupObstacles() {
        let geometry = new THREE.BoxBufferGeometry( 12, 10, 12 );
        let firstMaterial = new THREE.MeshBasicMaterial( {color: 0x272727, vertexColors: THREE.FaceColors} );
        let secondMaterial = new THREE.MeshBasicMaterial( {color: 0x272727, vertexColors: THREE.FaceColors} );

        this._firstObstacle = new THREE.Mesh( geometry, firstMaterial );
        this._secondObstacle = new THREE.Mesh( geometry, secondMaterial );

        this._firstObstacle.position.set(0, Math.random() * 100, 0)
        this._secondObstacle.position.set(0, Math.random() * 100, 0)
        this._scene.add( this._firstObstacle, this._secondObstacle );
    }

    _setupBall() {
        let geometry = new THREE.SphereBufferGeometry( 1, 32, 32 );
        let material = new THREE.MeshLambertMaterial( {color: 0xff0000} );
        this._ball = new THREE.Mesh( geometry, material );
        this._ball.receiveShadow = true;
        this._ball.castShadow = true;
        this._ball.position.set(SETTINGS.ballPosition.x, SETTINGS.ballPosition.y, SETTINGS.ballPosition.z)
        this._scene.add( this._ball );
        this._setupBallPhysics(false);
    }

    _setupBallStick() {
        let geometry = new THREE.CylinderGeometry( 0.1, 0.1, 5, 32 );
        let material = new THREE.MeshBasicMaterial( {color: 0xFFE403} );
        this._ballStick = new THREE.Mesh( geometry, material );
        this._ballStick.position.copy( new THREE.Vector3(this._ball.position.x + 2.5, this._ball.position.y, this._ball.position.z));
        this._ballStick.rotation.x = Math.PI / 2;
        this._ballStick.rotation.z = Math.PI / 2;

        this._scene.add( this._ballStick );
    }

    _setupBallPhysics(isMoving) {
        this._ballBody = this._oimoWorld.add({ 
            type:'sphere', 
            size:[1,1,1],
            pos:[this._ball.position.x, this._ball.position.y, this._ball.position.z],
            rot:[0, 0, 0],
            move: isMoving,
            density: 1,
            friction: 0.2,
            restitution: 0.2,
            belongsTo: 0,
            collidesWith: 0
        });
    }

    _setupStickHole() {
        let geometry = new THREE.CircleBufferGeometry( 0.3, 10 );
        let material = new THREE.MeshBasicMaterial( { color: 0x000000, side: THREE.DoubleSide } );
        let circle = new THREE.Mesh( geometry, material );
        circle.rotation.y = Math.PI / 2
        circle.position.set(this._ballStick.position.x + 2.45, this._ballStick.position.y, this._ballStick.position.z)
        this._scene.add( circle );
    }

    _setupTrees() {
        for (let index = 0; index < 5; index++) {
            for (let i = 0; i < 20; i++) {
                let pos = {
                    x: Math.random() * 200,
                    y: 0,
                    z: Math.random() * 200,
                }
                if (i % 2 === 0) {
                    pos.z = Math.random() * -200;

                }
                let treeCloned = this._models[`tree_0${index}`].clone();
                
                treeCloned.position.set(pos.x, pos.y, pos.z)
                treeCloned.scale.set(0.06, 0.06, 0.06)
                treeCloned.receiveShadow = true
                treeCloned.castShadow = true
                this._scene.add(treeCloned)
            }
        }
    }

    _setupLights() {
        let directionnalLight = new THREE.DirectionalLight( 0x404040, 2 );
        let ambientLight = new THREE.AmbientLight( 0x404040, 2 );

        this._scene.add( directionnalLight, ambientLight );
    }

    _launchBall() {
        if(this._ballLaunched) return;
        this._ballLaunched = true;

        this._setupBallPhysics(true)

        TweenLite.to(this._ballStick.scale, 0.1, {x: 0, y: 0, z: 0, ease: Power3.easeInOut})
        
        this._ballBody.applyImpulse({x: 0, y: 1, z: 0}, {x: 0, y: 5 * this._launchingBallForce, z: 0})
        this._launchingBallForce = 0;
    }

    _stopBall() {
        this._ballLaunched = false;
        if(this._cantClick) {
            this._ballBody.applyImpulse({x: 0, y: -100, z: 0}, {x: 0, y: -100, z: 0})
        } else {
            TweenLite.to(this._ballStick.scale, 0.2, {x: 1, y: 1, z: 1, ease: Power3.easeOut})
            
            this._ballBody.setPosition(this._ball.position)
            this._ballStick.position.copy( new THREE.Vector3(this._ball.position.x + 2.5, this._ball.position.y, this._ball.position.z));
            
            this._setupBallPhysics(false)
            this._setupStickHole()
        }
    }

    _animate() {
        window.requestAnimationFrame(() => this._animate());
        this._render();
    }

    _render() {
        this._oimoWorld.step();

        this._cameraFollowUpdate();
        console.log(this._ballBody.pos.y > this._firstObstacle.position.y - 1 && this._ballBody.pos.y < this._firstObstacle.position.y + 1)
        if(this._ballLaunched) {
            this._ball.rotation.y += 0.3
            // if(this._ball.position)
            if(this._ballBody.pos.y > this._firstObstacle.position.y - 1 && this._ballBody.pos.y < this._firstObstacle.position.y + 1) {
                this._cantClick = true;
            } else {
                this._cantClick = false;
            }
        }

        if(this._ballBody.pos.y < -10) {
            this._ballBody.resetPosition(SETTINGS.ballPosition.x, SETTINGS.ballPosition.y, SETTINGS.ballPosition.z)
            setTimeout(() => {
                this._setupBallPhysics(false);
            }, 100);
        }

        this._ball.position.copy( this._ballBody.getPosition() );

        this._renderer.render(this._scene, this._camera)
    }

    _resize() {
        this._width = window.innerWidth;
        this._height = window.innerHeight;
        this._devicePixelRatio = window.devicePixelRatio;

        this._renderer.setSize(this._width, this._height);
        this._renderer.setPixelRatio(this._devicePixelRatio);

        this._camera.aspect = this._width/this._height;
        this._camera.updateProjectionMatrix();
    }

    _cameraFollowUpdate(){
         let offset = new THREE.Vector3(this._ball.position.x - 20, this._ball.position.y, this._ball.position.z);
         this._camera.position.lerp(offset, 0.1);
         this._camera.lookAt(this._ball.position.x, this._ball.position.y, this._ball.position.z); 
    }

    _resizeHandler() {
        this._resize();
    }
    
    _tapHandler() {
        this._stopBall();
    }

    _panStartHandler(panEvent) {
        // console.log(panEvent)
    }

    _panMoveHandler(panEvent) {
        this._launchingBallForce = 0

        if(panEvent.direction === 16 && panEvent.deltaY > 10) {
        this._launchingBallForce -= 0.5

        } else if ( panEvent.direction === 8 && panEvent.deltaY > 0) {
            this._launchingBallForce += 0.5
        }

        this._ballBody.pos.y = lerp(this._ballBody.pos.y, this._ballBody.pos.y + this._launchingBallForce, 0.1);
        this._launchingBallForce = panEvent.deltaY * 0.05;
    }

    _panEndHandler() {
        this._launchBall();
    }

    _settingsChangedHandler() {
        this._camera.position.set(SETTINGS.cameraPosition.x, SETTINGS.cameraPosition.y, SETTINGS.cameraPosition.z )
    }
}

export default ThreeMainScene;