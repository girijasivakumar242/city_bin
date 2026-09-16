const mongoose = require("mongoose");

const depotSchema = new mongoose.Schema(
  {
    depotId: {
      type: String,
      required: true,
      unique: true,
    },

    osmId: {
      type: String,
      unique: true,
      sparse: true,
    },

    name: {
      type: String,
      default: "Unnamed Depot",
    },

    type: {
      type: String,
      enum: [
        "WASTE_TRANSFER_STATION",
        "WASTE_RELATED_INDUSTRIAL",
        "RECYCLING_CENTER",
        "LANDFILL",
        "WASTEWATER_PLANT",
        "OTHER",
      ],
      default: "OTHER",
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
      default: "Coimbatore",
    },

    status: {
      type: String,
      enum: [
        "AVAILABLE",
        "BUSY",
        "INACTIVE",
      ],
      default: "AVAILABLE",
    },

    isTruckDepot: {
      type: Boolean,
      default: true,
    },
  },

  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model("Depot", depotSchema);