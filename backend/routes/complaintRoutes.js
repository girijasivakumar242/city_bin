const express = require("express");

const {
  createComplaint,
  getAllComplaints,
  getCustomerComplaints,
  updateComplaintStatus,
} = require("../controllers/complaintController");

const upload = require("../middleware/upload");

const router = express.Router();


// Customer submits complaint
// Photo/video is optional
router.post(
  "/",
  upload.single("media"),
  createComplaint
);


// Admin gets active complaints
router.get(
  "/",
  getAllComplaints
);


// Customer gets their complaints
router.get(
  "/customer/:customerId",
  getCustomerComplaints
);


// Admin updates complaint status
router.put(
  "/:id/status",
  updateComplaintStatus
);


module.exports = router;