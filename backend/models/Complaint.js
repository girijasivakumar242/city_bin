const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    binId: {
      type: String,
      required: false,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    mediaUrl: {
      type: String,
      default: "",
    },

    mediaType: {
      type: String,
      enum: ["image", "video", ""],
      default: "",
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Assigned",
        "In Progress",
        "Resolved",
      ],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Complaint",
  complaintSchema
);