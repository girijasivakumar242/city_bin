const multer = require("multer");

// Store uploaded files temporarily in memory
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },

  fileFilter: (req, file, cb) => {

    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Only image and video files are allowed"),
        false
      );
    }
  },
});

module.exports = upload;