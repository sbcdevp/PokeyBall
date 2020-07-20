import * as THREE from 'three';

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

import lerp from "../utils/lerp"

import * as dat from 'dat.gui';
import * as OIMO from 'oimo';
import Hammer from 'hammerjs';


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
        y: 50,
        z: 0
    }
}

class ThreeMainScene {
    constructor(models, materials) {
        // this._models = models;
        // this._materials = materials;

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

        
        this._setupRenderer();
        
        this._setupPhysics();

        this._setupScene();

        this._animate();
        this._setupListeners();
        this._resize();
    }

    _setupListeners() {
        window.addEventListener('resize', () => this._resizeHandler());
        this._container.addEventListener('click', () => this._clickHandler());
        document.addEventListener('keyup', () => this._testHandler());

    }

    _setupValues() {
        // this._time = 0;
    }

    _setupHammer() {

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
        this._scene.rotation.y = Math.PI *2 + 0.5;
        
        this._camera = new THREE.PerspectiveCamera(60, this._canvasSize.width/ this._canvasSize.height, 1, 5000);
        this._camera.position.set(SETTINGS.cameraPosition.x, SETTINGS.cameraPosition.y, SETTINGS.cameraPosition.z);
        
        this._controls = new OrbitControls(this._camera, this._canvas);

        this._setupSceneObjects();
    }


    _setupSceneObjects() {
        this._setupGround();
        this._setupTargetBox();
        this._setupBall();
        this._setupBallStick();
    }

    _setupGround() {
        let geometry = new THREE.PlaneBufferGeometry( 500, 500, 32 );
        let material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
        this._ground = new THREE.Mesh( geometry, material );
        this._ground.rotation.x = Math.PI / 2
        this._scene.add( this._ground );
    }

    _setupTargetBox() {
        let geometry = new THREE.BoxBufferGeometry( 10, 100, 10 );
        let material = new THREE.MeshBasicMaterial( {color: 0x808080} );
        this._targetBox = new THREE.Mesh( geometry, material );
        this._targetBox.position.set(0, 50, 0)
        this._scene.add( this._targetBox );
    }

    _setupBall() {
        let geometry = new THREE.SphereBufferGeometry( 1, 32, 32 );
        let material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
        this._ball = new THREE.Mesh( geometry, material );
        this._ball.position.set(SETTINGS.ballPosition.x, SETTINGS.ballPosition.y, SETTINGS.ballPosition.z)
        this._scene.add( this._ball );
        this._setupBallPhysics(false);
    }

    _setupBallStick() {
        let geometry = new THREE.CylinderGeometry( 0.1, 0.1, 5, 32 );
        let material = new THREE.MeshBasicMaterial( {color: 0x33CC00} );
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

    _stopBallOnClick() {
        // this.clicked = true;
        this._ballBody.setPosition(this._ball.position)
        this._setupBallPhysics(false)
    }

    _restartBallOnClick() {
        this._setupBallPhysics(true)
        this._ballBody.applyImpulse({x: 0, y: 1, z: 0}, {x: 0, y: 200, z: 0})
    }

    _animate() {
        window.requestAnimationFrame(() => this._animate());
        this._render();
    }

    _render() {
        this._oimoWorld.step();

        if(this._ballBody.pos.y < 0) {
            this._ballBody.resetPosition(SETTINGS.ballPosition.x, SETTINGS.ballPosition.y, SETTINGS.ballPosition.z)
        }

        // if(this.clicked) {
        //     this.clicked = false;
        //     // this._ballStick.geometry.scale(lerp(this._ballStick.scale.x, 0, 0.1), lerp(this._ballStick.scale.x, 0, 0.1), 1)
        // }
        this._ball.position.copy( this._ballBody.getPosition() );
        this._ball.quaternion.copy( this._ballBody.getQuaternion() );

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

    _resizeHandler() {
        this._resize();
    }
    
    _clickHandler() {
        this._stopBallOnClick();
    }
    _testHandler() {
        this._restartBallOnClick();
    }

    _settingsChangedHandler() {
        this._camera.position.set(SETTINGS.cameraPosition.x, SETTINGS.cameraPosition.y, SETTINGS.cameraPosition.z )
    }
}

export default ThreeMainScene;