const Bin = require("../models/Bin");
const CollectionRequest = require("../models/CollectionRequest");
const { runRouteOptimization } = require("./routeController");

// GET ALL BINS
// ============================================================

const getAllBins = async (req, res) => {
  try {
    const bins = await Bin.find({}).sort({ createdAt: 1 });

    return res.status(200).json({
      message: "All bins fetched successfully",
      count: bins.length,
      bins,
    });
  } catch (error) {
    console.error("GET ALL BINS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch all bins",
      error: error.message,
    });
  }
};

// ============================================================
// CREATE BIN
// ============================================================

const createBin = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      city,
      area,
    } = req.body;

    if (
      latitude === undefined ||
      longitude === undefined ||
      !city ||
      !area
    ) {
      return res.status(400).json({
        message:
          "Latitude, longitude, city and area are required",
      });
    }

    const count = await Bin.countDocuments();

    const bin = await Bin.create({
      binId: `ADMIN-${String(count + 1).padStart(4, "0")}`,
      latitude,
      longitude,
      city,
      area,
      source: "ADMIN",
      level: 0,
      status: "Available",
    });

    return res.status(201).json({
      message: "Bin added successfully",
      bin,
    });
  } catch (error) {
    console.error("CREATE BIN ERROR:", error);

    return res.status(500).json({
      message: "Failed to create bin",
      error: error.message,
    });
  }
};

// ============================================================
// GET OSM BINS
// ============================================================

const getOSMBins = async (req, res) => {
  try {
    const { city, area } = req.params;

    const bins = await Bin.find({
      city,
      area,
    });

    return res.status(200).json({
      bins,
    });
  } catch (error) {
    console.error("GET OSM BINS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch bins",
      error: error.message,
    });
  }
};

// ============================================================
// UPDATE BIN LEVEL
//
// BIN LEVEL
//     ↓
// THRESHOLD DETECTION
//     ↓
// COLLECTION REQUEST
//     ↓
// AUTOMATIC ROUTE OPTIMIZATION
//     ↓
// OR-TOOLS CVRP
//     ↓
// OSRM ROAD ROUTE
// ============================================================

const updateBinLevel = async (req, res) => {
  try {
    console.log("REQUEST BODY:", req.body);

    const { binId, level } = req.body || {};

    // --------------------------------------------------------
    // 1. Validate input
    // --------------------------------------------------------

    if (!binId || level === undefined) {
      return res.status(400).json({
        message: "binId and level are required",
      });
    }

    const numericLevel = Number(level);

    if (
      isNaN(numericLevel) ||
      numericLevel < 0 ||
      numericLevel > 100
    ) {
      return res.status(400).json({
        message: "Level must be a number between 0 and 100",
      });
    }

    // --------------------------------------------------------
    // 2. Determine normal bin status
    // --------------------------------------------------------

    let status;

    if (numericLevel <= 30) {
      status = "Available";
    } else if (numericLevel <= 60) {
      status = "Medium";
    } else if (numericLevel <= 80) {
      status = "High";
    } else {
      status = "Full";
    }

    // --------------------------------------------------------
    // 3. Update bin
    // --------------------------------------------------------

    const bin = await Bin.findOneAndUpdate(
      { binId },
      {
        level: numericLevel,
        status,
      },
      {
        returnDocument: "after",
      }
    );

    if (!bin) {
      return res.status(404).json({
        message: "Bin not found",
      });
    }

    // --------------------------------------------------------
    // 4. COLLECTION THRESHOLD
    //
    // 0 - 69%   → No collection request
    // 70 - 89%  → HIGH
    // 90 - 100% → CRITICAL
    // --------------------------------------------------------

    let priority = null;

    if (numericLevel >= 90) {
      priority = "CRITICAL";
    } else if (numericLevel >= 70) {
      priority = "HIGH";
    }

    console.log(
      `BIN ${binId} LEVEL: ${numericLevel}%`
    );

    if (priority) {
      console.log(
        `COLLECTION REQUIRED → ${priority}`
      );
    } else {
      console.log(
        "COLLECTION NOT REQUIRED → BELOW 70%"
      );
    }

    // --------------------------------------------------------
    // 5. Create collection request only if threshold reached
    // --------------------------------------------------------

    let newRequestCreated = false;

    if (priority) {
      const existingRequest =
        await CollectionRequest.findOne({
          binId: bin._id,
          status: {
            $in: [
              "NOT_ASSIGNED",
              "PENDING",
              "ASSIGNED",
            ],
          },
        });

      if (!existingRequest) {
        await CollectionRequest.create({
          binId: bin._id,
          priority,
          levelAtRequest: numericLevel,
          status: "NOT_ASSIGNED",
        });

        newRequestCreated = true;

        console.log(
          `Collection request created for ${binId} → ${priority}`
        );
      } else {
        console.log(
          `Collection request already exists for ${binId}`
        );
      }
    } else {
      await CollectionRequest.updateMany(
        {
          binId: bin._id,
          status: {
            $in: [
              "NOT_ASSIGNED",
              "PENDING",
            ],
          },
        },
        {
          $set: {
            status: "CANCELLED",
          },
        }
      );
    }

    // --------------------------------------------------------
    // 6. AUTOMATIC ROUTE OPTIMIZATION
    //
    // Run only when a NEW request is created.
    // --------------------------------------------------------

    if (newRequestCreated) {
      console.log(
        "NEW COLLECTION REQUEST DETECTED"
      );

      console.log(
        "STARTING AUTOMATIC ROUTE OPTIMIZATION..."
      );

      try {
        const optimizationResult =
          await runRouteOptimization();

        console.log(
          "AUTOMATIC ROUTE OPTIMIZATION COMPLETED"
        );

        console.log(
          "Optimization result:",
          optimizationResult.message
        );
      } catch (optimizationError) {
        console.error(
          "AUTOMATIC ROUTE OPTIMIZATION FAILED:",
          optimizationError.message
        );
      }
    }

    // --------------------------------------------------------
    // 7. Response
    // --------------------------------------------------------

    return res.status(200).json({
      message: "Bin level updated successfully",

      bin,

      collectionRequest: priority
        ? {
            required: true,
            priority,
            newRequestCreated,
          }
        : {
            required: false,
            priority: null,
            newRequestCreated: false,
          },
    });
  } catch (error) {
    console.error(
      "UPDATE BIN LEVEL ERROR:",
      error
    );

    return res.status(500).json({
      message: "Failed to update bin level",
      error: error.message,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createBin,
  getOSMBins,
  getAllBins,
  updateBinLevel,
};