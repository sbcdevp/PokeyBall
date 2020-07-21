// Test import of a JavaScript function, an SVG, and Sass
import '../sass/app.sass'
import LoadingComponent from './components/LoadingComponent';

// Create heading node

document.addEventListener('DOMContentLoaded', () => {
    new LoadingComponent()
});