const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: "",
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: [
        "admin",
        "truck",
        "customer",
      ],
      required: true,
    },

    truckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Truck",
      default: null,
    },

    depotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Depot",
      default: null,
    },

    truckRegistered: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);