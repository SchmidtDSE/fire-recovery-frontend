// Load images at random from a local folder.
window.onload = function() {
    const images = [
        'arches.jpg',
        'bryceCanyon.jpg',
        'glacier.jpg',
        'grandTeton.jpg',
        'joshuaTree.jpg',
        'joshuaTree2.jpg',
        'rockyMountains.jpg',
        'yellowstone.jpg',
        'yosemite.jpg',
    ];
    
    const getRandomImage = () => {
        const randomIndex = Math.floor(Math.random() * images.length);
        return images[randomIndex];
    };

    const setHeroImage = () => {
        const heroImageElement = document.querySelector('.hero-image');
        const imageUrl = `headerImages/${getRandomImage()}`;

        heroImageElement.style.backgroundImage = `url(${imageUrl})`;
    };

    setHeroImage();
};