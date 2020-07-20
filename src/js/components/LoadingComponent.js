import ThreeMainScene from "./ThreeMainScene.js"

import models from "../data/models.json"
import materials from "../data/materials.json"
import carboneMaterials from "../data/carboneMaterials.json"
import aluMaterials from "../data/aluMaterials.json"
import crocoMaterials from "../data/crocoMaterials.json"

import {gsap, TweenLite, Power3} from 'gsap'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

import * as THREE from 'three';

gsap.registerPlugin();

class LoadingComponent {
    constructor() {
        this._setup();
    }

    _setup() {
        this._promises = [];
        this.models = {}; 
        this._progress = 0
        this.materials = {}; 

        this._ui = {
            mainContainer: document.querySelector(".js-container"),
            loader: document.querySelector(".js-loader"),
            textLoader: document.querySelector(".js-text-loader"),
        }
        this._tweenObject = {
            value: 0
        }

        this._isFinished = false;

        this._modelsLoaded = 0; 

        this._ui.loader.style.visibility = "visible";
        this._setupLoaders();
        this._loadAssets().then(() => this._assetsLoadedHandler());
    }

    _setupLoaders() {

        let dracoLoader = new DRACOLoader();
        this._textureLoader = new THREE.TextureLoader()
        this._gltfLoader = new GLTFLoader()

        dracoLoader.setDecoderPath('assets/draco/');
        this._gltfLoader.setDRACOLoader(dracoLoader);
    }

    _loadAssets() {
        let totalItems = materials.length;
        
        for (let i = 0; i < materials.length; i++) {
            let promise = new Promise(resolve => {
                this._textureLoader.load(materials[i].url, resolve);
                this.materials[`${materials[i].name}`] = {};
            })
                .then(result => {
                    this._loadingHandler(materials.length/totalItems * 100);

                    this.materials[`${materials[i].name}`] = result;
                });
            this._promises.push(promise);
        }

        for (let i = 0; i < models.length; i++) {
            let promise = new Promise(resolve => {
                
                this._gltfLoader.load(models[i].url, resolve);
                this.models[`${models[i].name}`] = {};
            })
                .then(result => {
                    this._progress += 1;
                    this.models[`${models[i].name}`] = result;
                });
            this._promises.push(promise);
        }
        return Promise.all(this._promises);
    }

    _assetsLoadedHandler() {
    //    this._threeMainScene =  new ThreeMainScene(this.models, this.materials);
    }    

    _loadingHandler(progress) {
        TweenLite.to(this._tweenObject, .5, { value: progress, onUpdate: () => {
            this._ui.textLoader.innerHTML = Math.floor(this._tweenObject.value)
            if (this._tweenObject.value === 100) {
                this._loaderAnimationCompleted();
            }
        } })
    }

    _loaderAnimationCompleted() {
        if(!this._isFinished) {
            
            this._isFinished = true;
            TweenLite.to(this._ui.loader, 1, {height: 0, ease: Power3.easeInOut, display: "none", delay: 5})
            this._ui.colorContainer.classList.add("active")
            this._ui.mainContainer.style.visibility = "visible";
        }
    }
}

export default LoadingComponent;