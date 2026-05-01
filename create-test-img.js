const sharp = require("sharp");
sharp({
  create: {
    width: 1000,
    height: 1000,
    channels: 4,
    background: { r: 255, g: 0, b: 0, alpha: 1 }
  }
})
  .webp({ quality: 80 })
  .toFile("test-image.webp")
  .then(() => console.log("Test image created"))
  .catch(e => console.error(e));
