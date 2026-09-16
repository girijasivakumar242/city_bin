const express = require("express");

const router =
  express.Router();

const {
  getPendingRequests,
  getRoutePlanningData,
  optimizeRoutes,
  getSavedRoutes,
  collectRouteBin,
} = require("../controllers/routeController");

const authMiddleware =
  require("../middleware/authMiddleware");


router.get(
  "/pending",
  getPendingRequests
);


router.get(
  "/planning-data",
  getRoutePlanningData
);


router.post(
  "/optimize",
  optimizeRoutes
);


router.get(
  "/saved",
  getSavedRoutes
);


router.post(
  "/:routeId/bins/:binId/collect",
  authMiddleware,
  collectRouteBin
);


module.exports = router;