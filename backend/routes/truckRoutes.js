const express = require("express");

const router =
  express.Router();

const {

  registerTruck,

  getMyTruck,

  getAllTrucks,

  updateTruckStatus,

  updatePhone,
  getAvailableTrucks,

} =
  require("../controllers/truckController");

const authMiddleware =
  require("../middleware/authMiddleware");



router.post(
  "/register",
  authMiddleware,
  registerTruck
);



router.get(
  "/my-truck",
  authMiddleware,
  getMyTruck
);



router.get(
  "/all",
  authMiddleware,
  getAllTrucks
);


router.put(
  "/status",
  authMiddleware,
  updateTruckStatus
);



router.put(
  "/phone",
  authMiddleware,
  updatePhone
);

router.get("/available", getAvailableTrucks);
module.exports = router;