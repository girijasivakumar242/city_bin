const mongoose = require("mongoose");

const truckSchema = new mongoose.Schema(
  {
    driverName: {
      type: String,
      required: true,
      trim: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    truckId: {
      type: String,
      required: true,
      unique: true,
    },

    truckNumber: {
      type: String,
      required: true,
      unique: true,
    },

    capacity: {
      type: Number,
      required: true,
    },

    depotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Depot",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "AVAILABLE",
        "UNAVAILABLE",
      ],
      default: "AVAILABLE",
    },

  assignmentStatus: {
  type: String,
  enum: ["NOT_ASSIGNED", "ASSIGNED"],
  default: "NOT_ASSIGNED",
  },
  
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Truck", truckSchema);