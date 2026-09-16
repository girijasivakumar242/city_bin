const express = require("express");

const router = express.Router();

const {
  createBin,
  getOSMBins,
  getAllBins,
   updateBinLevel,
} = require("../controllers/binController");
router.get("/all", getAllBins);
router.post("/", createBin);

router.get("/osm/:city/:area", getOSMBins);
router.post("/update-level", updateBinLevel);

module.exports = router;