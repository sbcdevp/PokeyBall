import ThreeMainScene from "./ThreeMainScene.js"

import models from "../data/models.json"
import textures from "../data/textures.json"

import {gsap, TweenLite, Power3} from 'gsap'

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

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
        this.textures = {}; 

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
        this._textureLoader = new THREE.TextureLoader()
        this._fbxLoader = new FBXLoader()
    }

    _loadAssets() {
        // let totalItems = materials.length;
        
        for (let i = 0; i < textures.length; i++) {
            let promise = new Promise(resolve => {
                this._textureLoader.load(textures[i].url, resolve);
                this.textures[`${textures[i].name}`] = {};
            })
                .then(result => {
                    // this._loadingHandler(textures.length/totalItems * 100);

                    this.textures[`${textures[i].name}`] = result;
                });
            this._promises.push(promise);
        }

        for (let i = 0; i < models.length; i++) {
            let promise = new Promise(resolve => {
                
                this._fbxLoader.load(models[i].url, resolve);
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
       this._threeMainScene =  new ThreeMainScene(this.models, this.textures);
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