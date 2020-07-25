import * as THREE from 'three';

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

import { gsap, TimelineLite, Power3, TweenLite } from "gsap";
import Stats from "stats.js"

import lerp from "../utils/lerp"
import "../utils/tween"

import { Sky } from 'three/examples/jsm/objects/Sky.js'

import * as dat from 'dat.gui';

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
        redBoxHeight: 8,
        firstTargetBoxHeight: 475,
        secondTargetBoxHeight: 20, 
        thirdTargetBoxHeight: 50,
        blueWinBoxHeight: 5,
        yellowWinBoxHeight: 3.5,
        greenWinBoxHeight: 3,
        checkPoint: 115
    }
}

class ThreeMainScene {
    constructor(models, textures) {
        this._models = models;
        this._textures = textures;


        this._canvas = document.querySelector('.js-canvas');

        this._container = document.querySelector('.js-container');

        this._ui = {
        }
        this._setup();
    }

    _setup() {
        this._setupValues();

        this._setupHammer();
        this._setupListeners();

        this._setupRenderer();

        this._setupScene();
        this._setupStats()
        this._animate();
        this._resize();
    }

    _setupValues() {
        this._launchingBallForce = 0;
        this._ballLaunched = false;
        this._holes = [];
        this._coins = [];
        this._blackObstacles = [];
        this._redObstacles = [];
        this._startPanY = 0;

        this._targetPositions = [55.5, 99.25, 135, 201.5, 260, 349];

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
    
    _setupScene() {
        this._canvasSize = this._canvas.getBoundingClientRect();

        this._scene = new THREE.Scene();
        this._scene.rotation.y = Math.PI *2 - 0.25;
        
        this._scene.fog = new THREE.FogExp2( 0xB3B3B3, 0.001 );

        this._camera = new THREE.PerspectiveCamera(60, this._canvasSize.width/ this._canvasSize.height, 1, 5000);
        this._camera.position.set(SETTINGS.cameraPosition.x, SETTINGS.cameraPosition.y, SETTINGS.cameraPosition.z);
        
        // this._controls = new OrbitControls(this._camera, this._canvas);

        this._setupSceneObjects();
    }

    _setupStats() {
        this._stats = new Stats();
        this._stats.showPanel( 0 );
        document.body.appendChild( this._stats.dom );
    }

    _setupSceneObjects() {
        this._skyProperties();
        this._skyColor();

        this._setupGround();
        this._setupLights();
        this._setupTrees();
        
        this._setupObstacles();
        this._setupTargetBox();
        this._setupBall();
        this._setupBallStick();
        this._setupStickHole();

        this._setupBonusCoins()
        this._setupBoostTargets();
        this._setupWinTargets();
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

    _setupLights() {
        let directionnalLight = new THREE.DirectionalLight( 0x404040, 1 );
        let ambientLight = new THREE.AmbientLight( 0x404040, 2 );
        directionnalLight.position.set(-10, 10, 0)

        this._scene.add( directionnalLight, ambientLight );
    }

    _setupTrees() {
        for (let index = 0; index < 5; index++) {
            let tree = this._models[`tree_0${index}`]
            tree.scale.set(0.2, 0.2, 0.2)
            tree.receiveShadow = true
            tree.castShadow = true

            for (let i = 0; i < 50; i++) {
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

    _setupTargetBox() {
        let firstGeometry = new THREE.BoxGeometry( 10, SETTINGS.obstacles.firstTargetBoxHeight, 10 );
        let secondGeometry = new THREE.BoxGeometry( 10, SETTINGS.obstacles.secondTargetBoxHeight, 10 );
        let thirdGeometry = new THREE.BoxGeometry( 10, SETTINGS.obstacles.thirdTargetBoxHeight, 10 );

        let material = new THREE.MeshBasicMaterial( {color: 0xFFF2F2, vertexColors: THREE.FaceColors} );

        this._firstTargetBox = new THREE.Mesh( firstGeometry, material );
        this._secondTargetBox = new THREE.Mesh( secondGeometry, material );
        this._thirdTargetBox = new THREE.Mesh( thirdGeometry, material );


        this._firstTargetBox.geometry.faces[ 8 ].color.setHex( 0xE1D0D0 );
        this._firstTargetBox.geometry.faces[ 9 ].color.setHex( 0xE1D0D0 ); 
        this._secondTargetBox.geometry.faces[ 8 ].color.setHex( 0xE1D0D0 );
        this._secondTargetBox.geometry.faces[ 9 ].color.setHex( 0xE1D0D0 ); 
        this._thirdTargetBox.geometry.faces[ 9 ].color.setHex( 0xE1D0D0 ); 
        this._thirdTargetBox.geometry.faces[ 8 ].color.setHex( 0xE1D0D0 );
        
        this._firstTargetBox.position.set(0, 25, 0)
        this._secondTargetBox.position.set(0, 350, 0)
        this._thirdTargetBox.position.set(0, 440, 0)

        this._scene.add( this._firstTargetBox, this._secondTargetBox, this._thirdTargetBox );
    }

    _setupObstacles() {
        let blackGeometry = new THREE.BoxBufferGeometry( 12, SETTINGS.obstacles.blackBoxHeight, 12 );
        let redGeometry = new THREE.BoxBufferGeometry( 12, SETTINGS.obstacles.redBoxHeight, 12 );

        let blackMaterial = new THREE.MeshBasicMaterial( {color: 0x000000} );
        let redMaterial = new THREE.MeshBasicMaterial( {color: 0xaa1515} );

        let blackObstacle = new THREE.Mesh( blackGeometry, blackMaterial );
        let redObstacle = new THREE.Mesh( redGeometry, redMaterial );
        
        blackObstacle.name = "blackObstacle"
        redObstacle.name = "redObstacle"

        for (let index = 1; index < 4; index++) {
           this._placeObstacles(20, index, 1.4, blackObstacle, SETTINGS.obstacles.blackBoxHeight)
        }
        for (let index = 1; index < 3; index++) {
            this._placeObstacles(37.5, index, 1.5, redObstacle, SETTINGS.obstacles.redBoxHeight)
        }
        this._placeObstacles(62.5, 1, 1.4, blackObstacle, SETTINGS.obstacles.blackBoxHeight)
        this._placeObstacles(66.5, 1, 1.4, redObstacle, SETTINGS.obstacles.redBoxHeight)
        for (let index = 1; index < 3; index++) {
            this._placeObstacles(80, index, 1.4, blackObstacle, SETTINGS.obstacles.blackBoxHeight)
        }
        
        this._placeObstacles(95, 1, 1.4, redObstacle, SETTINGS.obstacles.redBoxHeight)
        for (let index = 1; index < 3; index++) {
            this._placeObstacles(120, index, 2, blackObstacle, SETTINGS.obstacles.blackBoxHeight)
        }

        for (let index = 1; index < 6; index++) {
            this._placeObstacles(155, index, 1, redObstacle, SETTINGS.obstacles.redBoxHeight)
        }
        this._placeObstacles(197, 1, 1.4, redObstacle, SETTINGS.obstacles.redBoxHeight)

        for (let index = 1; index < 6; index++) {
            this._placeObstacles(220, index, 1.4, blackObstacle, SETTINGS.obstacles.blackBoxHeight)
        }

        for (let index = 1; index < 3; index++) {
            this._placeObstacles(325, index, 2, redObstacle, SETTINGS.obstacles.redBoxHeight)
        }

        for (let index = 0; index < this._targetPositions.length; index++) {
            this._setupBoostTargets(this._targetPositions[index])
        }
    }

    _placeObstacles(position, index, padding, obstacleType, height) {
        let obstacle = obstacleType.clone()
        obstacle.position.set(0, position + index * height * padding, 0)
        obstacle.name === "blackObstacle" ? this._blackObstacles.push(obstacle) : this._redObstacles.push(obstacle)
        this._scene.add( obstacle );
    }

    _setupBall() {
        let geometry = new THREE.SphereBufferGeometry( 1, 32, 32 );
        let material = new THREE.MeshPhongMaterial( { 
            color: 0xffffff,
            specular: 0xffffff,
            shininess: 50,
            map: this._textures.ball
        } ) 
        this._ball = new THREE.Mesh( geometry, material );
        this._ball.receiveShadow = true;
        this._ball.castShadow = true;
        this._ball.position.set(SETTINGS.ballPosition.x, SETTINGS.ballPosition.y, SETTINGS.ballPosition.z)
        this._scene.add( this._ball );
        this._setupBallPhysics(false);
    }

    _setupBallStick() {
        this._startStickV = new THREE.Vector3(-3.5, 0.25, 0);
        this._middleStickV = new THREE.Vector3(0, -0.5, 0);
        this._endStickV = new THREE.Vector3(0, 0.5, 0);

        let curveQuad = new THREE.QuadraticBezierCurve3(this._startStickV, this._middleStickV , this._endStickV);

        let tube = new THREE.TubeGeometry(curveQuad, 64, 0.1, 8, false);
        this._ballStick = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({color: 0xFFE403, side: THREE.DoubleSide}));
        this._ballStick.position.copy( new THREE.Vector3(this._ball.position.x, this._ball.position.y, this._ball.position.z));
        // this._ballStick.rotation.x = Math.PI / 2;
        this._ballStick.rotation.z = Math.PI
        // let geometry = new THREE.CylinderBufferGeometry( 0.1, 0.1, 5, 32 );
        // let geometry = new THREE.TubeGeometry( this._stickPath(10), 20, 2, 8, false );
        // let material = new THREE.MeshBasicMaterial( {color: 0xFFE403} );
        // this._ballStick = new THREE.Mesh( geometry, material );
        
        this._scene.add( this._ballStick );
    }

    _setupBallPhysics() {
        this._ballBody = {
            pos: {x: SETTINGS.ballPosition.x, y: SETTINGS.ballPosition.y, z: SETTINGS.ballPosition.z},
            velocity: {x: 0, y: 0},
            mass: 5,
            radius: 1, 
            restitution: -0.5
            };

            this._Cd = 0.47; 
            this._rho = 1.22;
            this._A = Math.PI * this._ballBody.radius * this._ballBody.radius / (10000);
            this._ag = -100; 
            this._frameRate = 1/60
    }

    _setupStickHole() {
        let geometry = new THREE.CircleBufferGeometry( 0.3, 10 );
        let material = new THREE.MeshBasicMaterial( { color: 0x000000, side: THREE.DoubleSide } );
        let circle = new THREE.Mesh( geometry, material );
        circle.rotation.y = Math.PI / 2
        circle.position.set(this._ballStick.position.x + 2.40, this._ballStick.position.y, this._ballStick.position.z)
        this._scene.add( circle );
        this._holes.push(circle)
    }

    _setupBonusCoins() {
        let geometry = new THREE.CylinderBufferGeometry( 1, 1, 0.3, 32 );
        let material = new THREE.MeshStandardMaterial( {map: this._textures.coin, side: THREE.DoubleSide} );
        let cylinder = new THREE.Mesh( geometry, material );
        cylinder.rotation.z = Math.PI / 2
        cylinder.receiveShadow = true
        cylinder.castShadow = true

        for (let index = 0; index < 10; index++) {
            let cylinderCloned = cylinder.clone()
            if(index % 2 === 0) {
                cylinderCloned.position.set(-10, 250 + index * 3, 0)
            } else {
                cylinderCloned.position.set(-10, 10 + index * 3, 0)
            }
            this._coins.push(cylinderCloned);
            this._scene.add( cylinderCloned );
        }
        
    }
    
    _setupWinTargets() {
        let blueGeometry = new THREE.BoxBufferGeometry( 12, SETTINGS.obstacles.blueWinBoxHeight, 12 );
        let yellowGeometry = new THREE.BoxBufferGeometry( 11, SETTINGS.obstacles.yellowWinBoxHeight, 11 );
        let greenGeometry = new THREE.BoxBufferGeometry( 10.1, SETTINGS.obstacles.greenWinBoxHeight, 10.1 );

        let blueMaterial = new THREE.MeshBasicMaterial( {color: 0x0086FF} );
        let yellowMaterial = new THREE.MeshBasicMaterial( {color: 0xFFD400} );
        let greenMaterial = new THREE.MeshBasicMaterial( {color: 0x45A827} );

        let blueBox = new THREE.Mesh( blueGeometry, blueMaterial );
        let yellowBox = new THREE.Mesh( yellowGeometry, yellowMaterial );
        let greenBox = new THREE.Mesh( greenGeometry, greenMaterial );     
        
        let clonedBlueBox = blueBox.clone()
        let clonedYellowBox = yellowBox.clone()

        blueBox.position.set(0, 429, 0)
        clonedBlueBox.position.set(0, 443, 0)
        
        yellowBox.position.set(0, 433, 0)
        clonedYellowBox.position.set(0, 439, 0)

        greenBox.position.set(0, 436, 0)
        this._scene.add(blueBox, clonedBlueBox, yellowBox, clonedYellowBox, greenBox)
    }

    _setupBoostTargets(yPosition) {
        let geometry = new THREE.CircleBufferGeometry( 2, 32 );
        let material = new THREE.MeshBasicMaterial( {  map: this._textures.target, side: THREE.DoubleSide } )
        let circle = new THREE.Mesh( geometry, material );
        circle.rotation.y = Math.PI / 2
        circle.position.set(-5.01, yPosition, 0)
        this._scene.add(circle)
    }

    _setupCheckPoint() {
        let checkPointGeometry = new THREE.BoxBufferGeometry( 8, 2, 9 );
        let material = new THREE.MeshBasicMaterial( {color: 0xFFF2F2, vertexColors: THREE.FaceColors} );

        this._checkPointBox = new THREE.Mesh( checkPointGeometry, material );
        this._checkPointBox.position.set(0, SETTINGS.obstacles.checkPoint - 2, 0)
        TweenLite.to(this._checkPointBox.position, 0.5, {x:-8})
        this._scene.add(this._checkPointBox);
    }

    _launchBall() {
        if(this._ballLaunched) return;
        this._ballLaunched = true;
        let boost = this._activeTarget ? 2 : 1.2
        this._ballBody.velocity.y = this._launchingBallForce * boost;
        TweenLite.to(this._ballStick.scale, 0.1, {x: 0, y: 0, z: 0, ease: Power3.easeInOut})
    }

    _stopBall() {
        this._obstaclesCollisions()
        if(this._noTarget) return;

        if(this._ballCantClick) {
            this._ballBody.velocity.y = 0; 
        } else if (this._ballResetOnClick) {
            this._resetBall();
        } else {
            this._ballLaunched = false;
            TweenLite.to(this._ballStick.scale, 0.2, {x: 1, y: 1, z: 1, ease: Power3.easeOut})
            
            this._ballBody.pos = {x: this._ball.position.x, y: this._ball.position.y, z: this._ball.position.z}
            this._ballStick.position.copy( new THREE.Vector3(this._ball.position.x + 2.5, this._ball.position.y, this._ball.position.z));
            
            this._launchingBallForce = 0

            this._setupStickHole()
        }
    }

    _resetBall() {
        this._holes.forEach(element => {
            this._scene.remove(element);
            element.geometry.dispose();
            element.material.dispose();
        });
        let ballCheckpointReset = this._isCheckpoint ?  SETTINGS.obstacles.checkPoint + 2 :  SETTINGS.ballPosition.y
        this._ballBody.pos = {x: SETTINGS.ballPosition.x, y: ballCheckpointReset, z: SETTINGS.ballPosition.z}
        setTimeout(() => {
            this._stopBall();
        }, 10);
        this._ballResetOnClick = false
    }

    _checkPointCollisions() {
        if(this._ballBody.pos.y < -2) {
            this._resetBall()
        }

        if(this._ballBody.pos.y > SETTINGS.obstacles.checkPoint && !this._isCheckpoint) {
            this._isCheckpoint = true;
            this._setupCheckPoint();
        }

        if(this._isCheckpoint && this._ballBody.pos.y < SETTINGS.obstacles.checkPoint  + 1- this._ballBody.radius) {
            this._ballBody.velocity.y *= this._ballBody.restitution;
            this._ballBody.pos.y = SETTINGS.obstacles.checkPoint + 1 - this._ballBody.radius
            if(Math.floor(this._ballBody.velocity.y) === 0) {
                this._stopBall();
            }
        }
    }

    _obstaclesCollisions() {
        this._targetPositions.forEach(target => {
            if(this._ballBody.pos.y > target - 1 && this._ballBody.pos.y < target + 1) {
                this._activeTarget = target;
            }
        })
        
        if(this._ballBody.pos.y > this._activeTarget + 2 || this._ballBody.pos.y < this._activeTarget - 2 ){
            this._activeTarget = null;
        }

        let color = this._activeTarget ?  0xD80F0F : 0xffffff
        let targetColor = new THREE.Color(color);
        TweenLite.to(this._ball.material.color, 0.5, {
            r: targetColor.r,
            g: targetColor.g,
            b: targetColor.b
        });

        this._blackObstacles.forEach(obstacle => {
            if(this._ballBody.pos.y > obstacle.position.y - SETTINGS.obstacles.blackBoxHeight / 2) {
                this._activeBlackObstacle = obstacle;
            }
        });
        this._redObstacles.forEach(obstacle => {
            if(this._ballBody.pos.y > obstacle.position.y - SETTINGS.obstacles.redBoxHeight / 2 && this._ballBody.pos.y < obstacle.position.y + SETTINGS.obstacles.redBoxHeight ) {
                this._activeRedObstacle = obstacle;
            }
        })  

        if(this._activeBlackObstacle && this._ballBody.pos.y > this._activeBlackObstacle.position.y - SETTINGS.obstacles.blackBoxHeight / 2 && this._ballBody.pos.y < this._activeBlackObstacle.position.y + SETTINGS.obstacles.blackBoxHeight / 2) {
            this._ballCantClick = true;
        } else {
            this._ballCantClick = false;
        }

        if (this._activeRedObstacle && this._ballBody.pos.y > this._activeRedObstacle.position.y - SETTINGS.obstacles.redBoxHeight / 2 && this._ballBody.pos.y < this._activeRedObstacle.position.y + SETTINGS.obstacles.redBoxHeight / 2) {
            this._ballResetOnClick = true;
        } else {
            this._activeRedObstacle = null
            this._ballResetOnClick = false;
        } 

         if(this._ballBody.pos.y > this._firstTargetBox.position.y + SETTINGS.obstacles.firstTargetBoxHeight / 2 && this._ballBody.pos.y < this._secondTargetBox.position.y - SETTINGS.obstacles.secondTargetBoxHeight / 2 || this._ballBody.pos.y > this._secondTargetBox.position.y + SETTINGS.obstacles.secondTargetBoxHeight / 2 && this._ballBody.pos.y < this._thirdTargetBox.position.y - SETTINGS.obstacles.thirdTargetBoxHeight / 2 || this._ballBody.pos.y > this._thirdTargetBox.position.y + SETTINGS.obstacles.thirdTargetBoxHeight / 2) {
                this._noTarget = true;
         } else {
            this._noTarget = false;
         }
    }

    _calculatePhysics() {
        if(this._ballLaunched) {
            let Fy = -0.5 * this._Cd * this._A * this._rho * this._ballBody.velocity.y * this._ballBody.velocity.y * this._ballBody.velocity.y / Math.abs(this._ballBody.velocity.y);
            
            Fy = (isNaN(Fy) ? 0 : Fy);
    
            let ay = this._ag + (Fy / this._ballBody.mass);
    
            this._ballBody.velocity.y += ay * this._frameRate
        
            this._ballBody.pos.y += this._ballBody.velocity.y*0.01;
        }
    }

    _animate() {
        window.requestAnimationFrame(() => this._animate());
        this._render();
    }

    _render() {
        this._stats.begin();

        if(this._isPanStart && this._startPanY > -30) {
            this._ballBody.pos.y = lerp(this._ballBody.pos.y, this._ballBody.pos.y + this._startPanY * 0.13, 0.1)
        }
        if(this._ballLaunched) {
            this._ball.rotation.z += this._ballBody.velocity.y * 0.003
        }

        // this._movingTargetBox.position.z = Math.sin(performance.now() * 0.002) * 5

        this._cameraFollowUpdate();
        this._calculatePhysics();
        this._checkPointCollisions();
        
        this._coins.forEach(coin => {
            coin.rotation.y += 0.01

            if(coin.position.y < this._ballBody.pos.y && coin.position.z > this._ballBody.pos.z - 1 && coin.position.z < this._ballBody.pos.z + 1) {
                this._scene.remove(coin);
                setTimeout(() => {
                    coin.geometry.dispose();
                    coin.material.dispose();
                }, 1000);
            }
        });

        this._ball.position.copy( new THREE.Vector3(this._ballBody.pos.x, this._ballBody.pos.y, this._ballBody.pos.z ));
    
        this._renderer.render(this._scene, this._camera)
        this._stats.end();

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
        this._startPanY = 0;
        this._isPanStart = true;
    }

    _panMoveHandler(panEvent) {
        this._launchingBallForce = 0

        if(panEvent.direction === 16 && panEvent.deltaY > 10) {
            this._startPanY -= 0.5
        }else if ( panEvent.direction === 8 && panEvent.deltaY > 0) {
            this._startPanY += 0.5
        }
        if(this._startPanY > -20) {
            this._launchingBallForce = this._startPanY * -4;
        } else {
            this._launchingBallForce = 90;
        }
    }

    _panEndHandler() {
        this._ballBody.pos.y = this._ball.position.y
        this._isPanStart = false;
        this._launchBall();
    }

}

export default ThreeMainScene;