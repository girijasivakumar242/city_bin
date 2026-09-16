const express = require("express");

const router = express.Router();

const {
  fetchDepots,
  getAllDepots,
  getTruckDepots,
  updateDepotStatus,
} = require("../controllers/depotController");


// Fetch from OpenStreetMap
router.get(
  "/fetch-osm",
  fetchDepots
);


// Get all facilities
router.get(
  "/all",
  getAllDepots
);


// Get only truck depots
router.get(
  "/truck-depots",
  getTruckDepots
);


// Enable / disable truck depot
router.patch(
  "/:depotId",
  updateDepotStatus
);


module.exports = router;