const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    routeId: {
      type: String,
      required: true,
      unique: true,
    },

    truckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Truck",
      required: true,
    },

    depotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Depot",
      required: true,
    },

    bins: [
      {
        binId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Bin",
          required: true,
        },

        sequence: {
          type: Number,
          required: true,
        },

        estimatedLoad: {
          type: Number,
          required: true,
        },

        priority: {
          type: String,
          enum: ["MEDIUM", "HIGH", "CRITICAL"],
          required: true,
        },

        collectionStatus: {
          type: String,
          enum: ["PENDING", "COLLECTED"],
          default: "PENDING",
        },

        collectedAt: {
          type: Date,
          default: null,
        },
      },
    ],

    totalLoad: {
      type: Number,
      required: true,
    },

    truckCapacity: {
      type: Number,
      required: true,
    },

    remainingCapacity: {
      type: Number,
      required: true,
    },

    totalDistanceKm: {
      type: Number,
      required: true,
    },

    roadDistanceKm: {
      type: Number,
      default: null,
    },

    roadDurationMinutes: {
      type: Number,
      default: null,
    },

    roadGeometry: {
      type: {
        type: String,
        enum: ["LineString"],
        default: "LineString",
      },

      coordinates: {
        type: [[Number]],
        default: [],
      },
    },

    routeLocations: [
      {
        sequence: {
          type: Number,
          required: true,
        },

        name: {
          type: String,
          default: "Unknown Location",
        },

        type: {
          type: String,
          enum: ["DEPOT", "BIN"],
          required: true,
        },

        binId: {
          type: String,
          default: null,
        },

        latitude: {
          type: Number,
          required: true,
        },

        longitude: {
          type: Number,
          required: true,
        },

        priority: {
          type: String,
          enum: ["MEDIUM", "HIGH", "CRITICAL", null],
          default: null,
        },
      },
    ],

    driverSteps: [
      {
        sequence: {
          type: Number,
          required: true,
        },

        roadName: {
          type: String,
          default: "Unnamed Road",
        },

        distanceMeters: {
          type: Number,
          default: 0,
        },

        durationSeconds: {
          type: Number,
          default: 0,
        },

        maneuver: {
          type: String,
          default: null,
        },

        modifier: {
          type: String,
          default: null,
        },

        location: {
          type: [Number],
          default: [],
        },
      },
    ],

    status: {
      type: String,
      enum: [
        "PLANNED",
        "ASSIGNED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PLANNED",
    },

    plannedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Route", routeSchema);