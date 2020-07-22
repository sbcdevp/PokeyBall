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
    },
    obstacles: {
        blackBoxHeight: 5,
        redBoxHeight: 8
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
        this._holes = [];
        this._coins = [];
        this._blackObstacles = [];
        this._redObstacles = [];

        this._ballResetOnClick = false;
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
        
        // this._scene.background = new THREE.Color( 0xF2CB73 );
        this._scene.fog = new THREE.FogExp2( 0xB3B3B3, 0.001 );

        this._camera = new THREE.PerspectiveCamera(60, this._canvasSize.width/ this._canvasSize.height, 1, 5000);
        this._camera.position.set(SETTINGS.cameraPosition.x, SETTINGS.cameraPosition.y, SETTINGS.cameraPosition.z);
        
        // this._controls = new OrbitControls(this._camera, this._canvas);

        this._setupSceneObjects();
    }


    _setupSceneObjects() {
        this._skyProperties();
        this._skyColor();

        this._setupObstacles();
        this._setupGround();
        this._setupTargetBox();
        this._setupBall();
        this._setupBallStick();
        this._setupStickHole();
        this._setupTrees();
        this._setupLights();
        this._setupBonusCoins()
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

    _setupGround() {
        let geometry = new THREE.PlaneBufferGeometry( 5000, 5000, 32 );
        let material = new THREE.MeshBasicMaterial( {color: 0xF2D037, side: THREE.DoubleSide} );
        this._ground = new THREE.Mesh( geometry, material );
        this._ground.rotation.x = Math.PI / 2
        this._scene.add( this._ground );
    }

    _setupTargetBox() {
        let firstGeometry = new THREE.BoxGeometry( 10, 50, 10 );
        let thirdgeometry = new THREE.BoxGeometry( 10, 200, 10 );

        let geometryMoving = new THREE.BoxGeometry( 10, 15, 10 );


        let material = new THREE.MeshBasicMaterial( {color: 0xFFF2F2, vertexColors: THREE.FaceColors} );
        let materialMoving = new THREE.MeshBasicMaterial( {color: 0xF6C7C7, vertexColors: THREE.FaceColors} );

        this._firstTargetBox = new THREE.Mesh( firstGeometry, material );
        this._secondTargetBox = new THREE.Mesh( geometryMoving, materialMoving );
        this._thirdTargetBox = new THREE.Mesh( thirdgeometry, material );


        this._firstTargetBox.geometry.faces[ 8 ].color.setHex( 0xE1D0D0 );
        this._firstTargetBox.geometry.faces[ 9 ].color.setHex( 0xE1D0D0 ); 
        this._secondTargetBox.geometry.faces[ 8 ].color.setHex( 0xE1D0D0 );
        this._secondTargetBox.geometry.faces[ 9 ].color.setHex( 0xE1D0D0 ); 
        this._thirdTargetBox.geometry.faces[ 8 ].color.setHex( 0xE1D0D0 );
        this._thirdTargetBox.geometry.faces[ 9 ].color.setHex( 0xE1D0D0 ); 

        this._firstTargetBox.position.set(0, 25, 0)
        this._secondTargetBox.position.set(0, 90, 0)
        this._thirdTargetBox.position.set(0, 250, 0)


        this._scene.add( this._firstTargetBox, this._secondTargetBox, this._thirdTargetBox );
    }

    _setupObstacles() {
        let blackGeometry = new THREE.BoxBufferGeometry( 12, SETTINGS.obstacles.blackBoxHeight, 12 );
        let redGeometry = new THREE.BoxBufferGeometry( 12, SETTINGS.obstacles.redBoxHeight, 12 );

        let blackMaterial = new THREE.MeshBasicMaterial( {color: 0x000000} );
        let redMaterial = new THREE.MeshBasicMaterial( {color: 0xaa1515} );

        let blackObstacle = new THREE.Mesh( blackGeometry, blackMaterial );
        let redObstacle = new THREE.Mesh( redGeometry, redMaterial );

        for (let index = 0; index < 6; index++) {
            let blackObstacleCloned = blackObstacle.clone()
            let redObstacleCloned = redObstacle.clone()
            
            blackObstacleCloned.position.set(0, 40 + index * 20, 0)
            redObstacleCloned.position.set(0, 150  + index * 30, 0)

            this._blackObstacles.push(blackObstacleCloned)
            this._redObstacles.push(redObstacleCloned)

            this._scene.add( blackObstacleCloned, redObstacleCloned );
        }
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
        this._holes.push(circle)
    }

    _setupTrees() {
        for (let index = 0; index < 5; index++) {
            let tree = this._models[`tree_0${index}`]
            tree.scale.set(0.2, 0.2, 0.2)
            tree.receiveShadow = true
            tree.castShadow = true

            for (let i = 0; i < 200; i++) {
                let treeCloned = tree.clone();

                let pos = {
                    x: Math.random() * 2000  + 10,
                    y: 0,
                    z: Math.random() * 2000 + 10,
                }
                if (i % 2 === 0) {
                    pos.z = Math.random() * -2000 - 10;
                }
                treeCloned.position.set(pos.x, pos.y, pos.z)
            
                this._scene.add(treeCloned)
            }
        }
    }

    _setupLights() {
        let directionnalLight = new THREE.DirectionalLight( 0x404040, 2 );
        let ambientLight = new THREE.AmbientLight( 0x404040, 2 );

        this._scene.add( directionnalLight, ambientLight );
    }

    _setupBonusCoins() {
        let geometry = new THREE.CylinderBufferGeometry( 1, 1, 0.3, 32 );
        let material = new THREE.MeshStandardMaterial( {color: 0xFFDE14} );
        let cylinder = new THREE.Mesh( geometry, material );
        cylinder.rotation.z = Math.PI / 2
        cylinder.receiveShadow = true
        cylinder.castShadow = true

        for (let index = 0; index < 30; index++) {
            let cylinderCloned = cylinder.clone()
            if(index % 2 === 0) {
                cylinderCloned.position.set(-10, 200 + index * 3, 0)
            } else {
                cylinderCloned.position.set(-10, 10 + index * 3, 0)
            }
            this._coins.push(cylinderCloned);
            this._scene.add( cylinderCloned );
        }
        
    }

    _launchBall() {
        if(this._ballLaunched) return;
        this._ballLaunched = true;

        this._setupBallPhysics(true)

        TweenLite.to(this._ballStick.scale, 0.1, {x: 0, y: 0, z: 0, ease: Power3.easeInOut})
        
        this._ballBody.applyImpulse({x: 0, y: 1, z: 0}, {x: 0, y: 2 * this._launchingBallForce, z: 0})
        this._launchingBallForce = 0;
    }

    _stopBall() {
        if(this._ballCantClick) {
            this._ballBody.applyImpulse({x: 0, y: -100, z: 0}, {x: 0, y: -100, z: 0})
        } else if (this._ballResetOnClick) {
            this._resetBall();
        } else {
            this._ballLaunched = false;
            TweenLite.to(this._ballStick.scale, 0.2, {x: 1, y: 1, z: 1, ease: Power3.easeOut})
            
            this._ballBody.setPosition(this._ball.position)
            this._ballStick.position.copy( new THREE.Vector3(this._ball.position.x + 2.5, this._ball.position.y, this._ball.position.z));
            
            this._setupBallPhysics(false)
            this._setupStickHole()
        }
    }

    _resetBall() {
        this._holes.forEach(element => {
            this._scene.remove(element);
            element.geometry.dispose();
            element.material.dispose();
        });

        this._ballBody.resetPosition(SETTINGS.ballPosition.x, SETTINGS.ballPosition.y, SETTINGS.ballPosition.z)
        setTimeout(() => {
            this._stopBall();
        }, 100);
        this._ballResetOnClick = false
    }

    _testCollisions() {
        if(this._ballLaunched) {
            this._ball.rotation.y += 0.3
            this._blackObstacles.forEach(obstacle => {
                if(this._ballBody.pos.y > obstacle.position.y - SETTINGS.obstacles.blackBoxHeight / 2) {
                    this._activeBlackObstacle = obstacle;
                }
                if(this._activeBlackObstacle && this._ballBody.pos.y > this._activeBlackObstacle.position.y - SETTINGS.obstacles.blackBoxHeight / 2 && this._ballBody.pos.y < this._activeBlackObstacle.position.y + SETTINGS.obstacles.blackBoxHeight / 2) {
                    this._ballCantClick = true;
                } else {
                    this._ballCantClick = false;
                }
            });
            this._redObstacles.forEach(obstacle => {
                if(this._ballBody.pos.y > obstacle.position.y - SETTINGS.obstacles.redBoxHeight / 2) {
                    this._activeRedObstacle = obstacle;
                }
                if (this._activeRedObstacle && this._ballBody.pos.y > this._activeRedObstacle.position.y - SETTINGS.obstacles.redBoxHeight / 2 && this._ballBody.pos.y < this._activeRedObstacle.position.y + SETTINGS.obstacles.redBoxHeight / 2) {
                    this._ballResetOnClick = true;
                }else {
                    this._ballResetOnClick = false;
            } 
        })  
        }

        if(this._ballBody.pos.y < 0.5) {
            this._resetBall()
        }

        if(this._ballBody.pos.y > this._secondTargetBox.position.y - 5 && this._ballBody.pos.y < this._secondTargetBox.position.y + 5 && !this._ballLaunched){
            this._ballBody.pos.z = this._secondTargetBox.position.z
            this._ballStick.position.z = this._ballBody.pos.z
            this._holes[this._holes.length - 1].position.z = this._ballStick.position.z
        }

        this._coins.forEach(coin => {
            if(coin.position.y < this._ballBody.pos.y && coin.position.z > this._ballBody.pos.z - 1 && coin.position.z < this._ballBody.pos.z + 1) {
                this._scene.remove(coin);
                coin.geometry.dispose();
                coin.material.dispose();
            }
        });
    }

    _animate() {
        window.requestAnimationFrame(() => this._animate());
        this._render();
    }

    _render() {
        this._oimoWorld.step();

        this._secondTargetBox.position.z = Math.sin(performance.now() * 0.002) * 5

        this._cameraFollowUpdate();
        
        this._testCollisions();

        this._coins.forEach(coin => {
            coin.rotation.y += 0.01
        });

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

        TweenLite.to(this._ballBody.pos, 1, {y: this._ballBody.pos.y + this._launchingBallForce})
        this._launchingBallForce = panEvent.deltaY * 0.2;
    }

    _panEndHandler() {
        this._launchBall();
    }

    _settingsChangedHandler() {
        this._camera.position.set(SETTINGS.cameraPosition.x, SETTINGS.cameraPosition.y, SETTINGS.cameraPosition.z )
    }
}

export default ThreeMainScene;