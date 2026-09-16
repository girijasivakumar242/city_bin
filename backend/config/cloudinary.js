const cloudinary = require("cloudinary").v2;

console.log("CLOUD NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API KEY:", process.env.CLOUDINARY_API_KEY);
console.log(
  "API SECRET EXISTS:",
  !!process.env.CLOUDINARY_API_SECRET
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;