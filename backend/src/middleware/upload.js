const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okExt = /\.(xlsx|csv)$/i.test(file.originalname);
    if (!okExt) return cb(new Error("Only .xlsx or .csv files are allowed"));
    cb(null, true);
  },
});

module.exports = { upload };
