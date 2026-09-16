const mongoose = require("mongoose");

const collectionRequestSchema = new mongoose.Schema(
  {
    binId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bin",
      required: true,
    },

    priority: {
      type: String,
      enum: ["MEDIUM", "HIGH", "CRITICAL"],
      required: true,
    },

    levelAtRequest: {
      type: Number,
      required: true,
    },

status: {
  type: String,
  enum: [
    "NOT_ASSIGNED",
    "ASSIGNED",
    "COLLECTED",
    "COMPLETED",
    "CANCELLED",
  ],
  default: "NOT_ASSIGNED",
},

    assignedTruckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Truck",
      default: null,
    },

    assignedRouteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      default: null,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    collectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "CollectionRequest",
  collectionRequestSchema
);