import * as THREE from 'three';

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

import * as dat from 'dat.gui';

const SETTINGS = {
    cameraPosition : {
        x: 0,
        y: 10,
        z: 80
    },
    directionnalLight: {
        intensity: 1.2
    },
    ambientLight: {
        intensity: 0.5
    },
    material: {
        metalness: 0
    }
}

class ThreeMainScene {
    constructor(models, materials) {
        console.log('working');

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
        this._setupScene();
        this._animate();

        this._setupListeners();
        this._resize();
    }

    _setupListeners() {
        window.addEventListener('resize', () => this._resizeHandler());
    }

    _setupValues() {
        // this._time = 0;
    }

    _setupRenderer() {
        this._renderer = new THREE.WebGLRenderer({
            canvas: this._canvas,
            antialias: true,
            // alpha: true,
        });

        this._renderer.setPixelRatio(3);
    }

    _setupScene() {
        this._canvasSize = this._canvas.getBoundingClientRect();

        this._scene = new THREE.Scene();
        this._scene.rotation.y = -10;
        
        this._camera = new THREE.PerspectiveCamera(60, this._canvasSize.width/ this._canvasSize.height, 1, 5000);
        this._camera.position.set(SETTINGS.cameraPosition.x, SETTINGS.cameraPosition.y, SETTINGS.cameraPosition.z);
        
        this._controls = new OrbitControls(this._camera, this._canvas);
        // this._controls.enableDamping = true;
        // this._controls.enablePan = false;
        // this._controls.minPolarAngle = 0.8;
        // this._controls.maxDistance = 30;        
        // this._controls.minDistance = 5;        

		// this._controls.maxPolarAngle = 2.4;
		// this._controls.dampingFactor = 0.07;
		// this._controls.rotateSpeed = 0.5;

        this._setupSceneObjects();
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

    _setupSceneObjects() {
        this._setupGround();
        this._setupTargetBox();
    }

    _setupGround() {
        let geometry = new THREE.PlaneBufferGeometry( 50, 50, 32 );
        let material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
        this._ground = new THREE.Mesh( geometry, material );
        this._ground.rotation.x = Math.PI / 2
        this._scene.add( this._ground );
    }

    _setupTargetBox() {
        var geometry = new THREE.BoxBufferGeometry( 10, 100, 10 );
        var material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
        this._targetBox = new THREE.Mesh( geometry, material );
        this._targetBox.position.set(0, 50, 0)
        this._scene.add( this._targetBox );
    }

    _animate() {
        window.requestAnimationFrame(() => this._animate());
        this._render();
    }

    _render() {

        this._renderer.render(this._scene, this._camera)
    }

    _resizeHandler() {
        this._resize();
    }
    
    _settingsChangedHandler() {
        this._camera.position.set(SETTINGS.cameraPosition.x, SETTINGS.cameraPosition.y, SETTINGS.cameraPosition.z )
    }
}

export default ThreeMainScene;