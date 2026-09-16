const Complaint = require("../models/Complaint");
const cloudinary = require("../config/cloudinary");

// ================= CREATE COMPLAINT =================

const createComplaint = async (req, res) => {
  try {
    const {
      customerId,
      location,
      binId,
      description,
    } = req.body;

    // Check required fields
    if (!customerId || !location || !description) {
      return res.status(400).json({
        message: "Customer ID, location and description are required",
      });
    }

    let mediaUrl = "";
    let mediaType = "";

    // ================= UPLOAD MEDIA =================

    if (req.file) {

      mediaType = req.file.mimetype.startsWith("image/")
        ? "image"
        : "video";

      const result = await new Promise((resolve, reject) => {

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "auto",
            folder: "city-bin-complaints",
          },

          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        uploadStream.end(req.file.buffer);
      });

      mediaUrl = result.secure_url;
    }

    // ================= CREATE COMPLAINT =================

    const complaint = await Complaint.create({
      customerId,
      location,
      binId,
      description,
      mediaUrl,
      mediaType,
      status: "Pending",
    });

    res.status(201).json({
      message: "Complaint submitted successfully",
      complaint,
    });

  } catch (error) {

    console.log("COMPLAINT ERROR:", error);

    res.status(500).json({
      message: "Failed to submit complaint",
      error: error.message,
    });
  }
};

const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint
      .find({
        status: {
          $ne: "Resolved",
        },
      })
      .populate("customerId", "email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      complaints,
    });

  } catch (error) {
    console.log("GET COMPLAINTS ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch complaints",
      error: error.message,
    });
  }
};


// ================= GET CUSTOMER COMPLAINTS =================
// Customer dashboard
// Customer can see ALL their complaints,
// including Resolved complaints

const getCustomerComplaints = async (req, res) => {
  try {
    const { customerId } = req.params;

    const complaints = await Complaint
      .find({
        customerId: customerId,
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      complaints,
    });

  } catch (error) {
    console.log(
      "GET CUSTOMER COMPLAINTS ERROR:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch customer complaints",
      error: error.message,
    });
  }
};


// ================= UPDATE COMPLAINT STATUS =================

const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Assigned",
      "In Progress",
      "Resolved",
    ];

    // Check valid status
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    // Update complaint
    const complaint = await Complaint.findByIdAndUpdate(
      id,
      {
        status: status,
      },
      {
        returnDocument: "after",
      }
    );

    // Complaint not found
    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    res.status(200).json({
      message: "Complaint status updated successfully",
      complaint,
    });

  } catch (error) {
    console.log(
      "STATUS UPDATE ERROR:",
      error
    );

    res.status(500).json({
      message: "Failed to update complaint status",
      error: error.message,
    });
  }
};


module.exports = {
  createComplaint,
  getAllComplaints,
  getCustomerComplaints,
  updateComplaintStatus,
};