const mongoose = require("mongoose");

const binSchema = new mongoose.Schema(
  {
    binId: {
      type: String,
      required: true,
      unique: true,
    },

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    area: {
      type: String,
      required: true,
    },

    source: {
      type: String,
      enum: ["OSM", "ADMIN"],
      default: "ADMIN",
    },

    level: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      default: "Available",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Bin", binSchema);