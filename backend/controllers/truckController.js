const Truck = require("../models/Truck");
const User = require("../models/User");
const Depot = require("../models/Depot");

// =====================================================
// REGISTER TRUCK
// =====================================================

const registerTruck = async (req, res) => {

  try {

    const userId = req.user.userId;

    const {
      driverName,
      truckId,
      truckNumber,
      capacity,
      depotId,
    } = req.body;


    // -----------------------------------------------
    // CHECK REQUIRED FIELDS
    // -----------------------------------------------

    if (
      !driverName ||
      !truckId ||
      !truckNumber ||
      !depotId
    ) {

      return res.status(400).json({

        message:
          "Driver name and all truck details are required",

      });

    }


    // -----------------------------------------------
    // CHECK USER
    // -----------------------------------------------

    const user =
      await User.findById(userId);


    if (!user) {

      return res.status(404).json({

        message:
          "User not found",

      });

    }


    // -----------------------------------------------
    // CHECK ROLE
    // -----------------------------------------------

    if (user.role !== "truck") {

      return res.status(403).json({

        message:
          "Only truck users can register a truck",

      });

    }


    // -----------------------------------------------
    // CHECK IF USER ALREADY HAS TRUCK
    // -----------------------------------------------

    const existingUserTruck =
      await Truck.findOne({

        userId: userId,

      });


    if (existingUserTruck) {

      return res.status(400).json({

        message:
          "You have already registered a truck",

      });

    }


    // -----------------------------------------------
    // CHECK TRUCK ID
    // -----------------------------------------------

    const formattedTruckId =
      truckId.toUpperCase();


    const existingTruck =
      await Truck.findOne({

        truckId:
          formattedTruckId,

      });


    if (existingTruck) {

      return res.status(400).json({

        message:
          "Truck ID already exists",

      });

    }


    // -----------------------------------------------
    // CHECK TRUCK NUMBER
    // -----------------------------------------------

    const existingTruckNumber =
      await Truck.findOne({

        truckNumber:
          truckNumber,

      });


    if (existingTruckNumber) {

      return res.status(400).json({

        message:
          "Truck number already exists",

      });

    }


    // -----------------------------------------------
    // CHECK DEPOT
    // -----------------------------------------------

    const depot =
      await Depot.findOne({

        _id: depotId,

        isTruckDepot: true,

        status: "AVAILABLE",

      });


    if (!depot) {

      return res.status(400).json({

        message:
          "Selected depot is not available for trucks",

      });

    }


    // -----------------------------------------------
    // CREATE TRUCK
    // -----------------------------------------------

    const truck =
      await Truck.create({

        driverName:
          driverName.trim(),

        truckId:
          formattedTruckId,

        truckNumber:
          truckNumber.trim(),

        capacity:
          capacity || 5000,

        userId:
          userId,

        depotId:
          depot._id,

        // DRIVER CONTROLLED STATUS
        status:
          "AVAILABLE",

        // SYSTEM CONTROLLED ASSIGNMENT STATUS
        assignmentStatus:
          "NOT_ASSIGNED",

      });


    // -----------------------------------------------
    // UPDATE USER
    // -----------------------------------------------

    user.truckRegistered = true;

    user.truckId = truck._id;

    user.depotId = depot._id;

    await user.save();


    // -----------------------------------------------
    // POPULATE DRIVER
    // -----------------------------------------------

    const populatedTruck =
      await Truck.findById(truck._id)

        .populate(
          "userId",
          "name email phone"
        )

        .populate(
          "depotId"
        );


    return res.status(201).json({

      message:
        "Truck registered successfully",

      truck:
        populatedTruck,

    });


  } catch (error) {

    console.error(
      "REGISTER TRUCK ERROR:",
      error
    );


    return res.status(500).json({

      message:
        "Failed to register truck",

      error:
        error.message,

    });

  }

};


// =====================================================
// GET LOGGED-IN DRIVER TRUCK
// =====================================================

const getMyTruck = async (req, res) => {

  try {

    const userId =
      req.user.userId;


    const truck =
      await Truck.findOne({

        userId:
          userId,

      })

      .populate(
        "depotId"
      )

      .populate(
        "userId",
        "name email phone"
      );


    if (!truck) {

      return res.status(404).json({

        message:
          "Truck not registered",

      });

    }


    return res.status(200).json({

      truck,

    });


  } catch (error) {

    console.error(
      "GET MY TRUCK ERROR:",
      error
    );


    return res.status(500).json({

      message:
        "Failed to fetch truck",

      error:
        error.message,

    });

  }

};


// =====================================================
// GET ALL TRUCKS
// =====================================================

const getAllTrucks = async (req, res) => {

  try {

    const trucks =
      await Truck.find()

        .populate(
          "userId",
          "name email phone"
        )

        .populate(
          "depotId"
        )

        .sort({

          createdAt: -1,

        });


    return res.status(200).json({

      trucks,

    });


  } catch (error) {

    console.error(
      "GET ALL TRUCKS ERROR:",
      error
    );


    return res.status(500).json({

      message:
        "Failed to fetch trucks",

      error:
        error.message,

    });

  }

};


// =====================================================
// UPDATE TRUCK AVAILABILITY
// =====================================================

const updateTruckStatus = async (req, res) => {

  try {

    console.log(
      "========== UPDATE TRUCK STATUS =========="
    );

    console.log(
      "REQ.USER:",
      req.user
    );

    console.log(
      "REQ.BODY:",
      req.body
    );


    const userId =
      req.user.userId;


    const {
      status,
    } = req.body;


    console.log(
      "USER ID:",
      userId
    );

    console.log(
      "STATUS:",
      status
    );


    // -----------------------------------------------
    // VALIDATE STATUS
    // -----------------------------------------------

    if (
      ![
        "AVAILABLE",
        "UNAVAILABLE",
      ].includes(status)
    ) {

      return res.status(400).json({

        message:
          "Invalid truck status",

      });

    }


    // -----------------------------------------------
    // FIND TRUCK
    // -----------------------------------------------

    const truck =
      await Truck.findOne({

        userId:
          userId,

      });


    console.log(
      "TRUCK FOUND:",
      truck
    );


    if (!truck) {

      return res.status(404).json({

        message:
          "Truck not found",

      });

    }


    // -----------------------------------------------
    // UPDATE ONLY DRIVER AVAILABILITY
    // -----------------------------------------------

    /*
     * IMPORTANT:
     *
     * status is manually controlled by driver.
     *
     * assignmentStatus is controlled by
     * route assignment system.
     *
     * Therefore changing availability MUST NOT
     * modify assignmentStatus.
     */

    truck.status =
      status;


    await truck.save();


    console.log(
      "TRUCK STATUS SAVED:",
      truck.status
    );

    console.log(
      "TRUCK ASSIGNMENT STATUS:",
      truck.assignmentStatus
    );


    // -----------------------------------------------
    // RETURN UPDATED TRUCK
    // -----------------------------------------------

    const updatedTruck =
      await Truck.findById(
        truck._id
      )

      .populate(
        "userId",
        "name email phone"
      )

      .populate(
        "depotId"
      );


    return res.status(200).json({

      message:
        "Truck availability updated successfully",

      truck:
        updatedTruck,

    });


  } catch (error) {

    console.error(
      "========== UPDATE TRUCK STATUS ERROR =========="
    );

    console.error(
      error
    );

    console.error(
      "ERROR MESSAGE:",
      error.message
    );

    console.error(
      "ERROR STACK:",
      error.stack
    );


    return res.status(500).json({

      message:
        "Failed to update truck status",

      error:
        error.message,

    });

  }

};


// =====================================================
// UPDATE DRIVER PHONE
// =====================================================

const updatePhone = async (req, res) => {

  try {

    const userId =
      req.user.userId;


    const {
      phone,
    } = req.body;


    // -----------------------------------------------
    // VALIDATE PHONE
    // -----------------------------------------------

    if (
      phone === undefined ||
      phone === null
    ) {

      return res.status(400).json({

        message:
          "Phone number is required",

      });

    }


    // -----------------------------------------------
    // UPDATE USER
    // -----------------------------------------------

    const user =
      await User.findByIdAndUpdate(

        userId,

        {
          phone:
            phone.toString().trim(),
        },

        {
          returnDocument: "after",
          runValidators: true,
        }

      );


    if (!user) {

      return res.status(404).json({

        message:
          "User not found",

      });

    }


    return res.status(200).json({

      message:
        "Phone number updated successfully",

      phone:
        user.phone,

    });


  } catch (error) {

    console.error(
      "UPDATE PHONE ERROR:",
      error
    );


    return res.status(500).json({

      message:
        "Failed to update phone number",

      error:
        error.message,

    });

  }

};


// =====================================================
// GET ELIGIBLE TRUCKS FOR ROUTE ASSIGNMENT
// =====================================================

const getAvailableTrucks = async (req, res) => {

  try {

    /*
     * A truck is eligible for a NEW route only when:
     *
     * 1. Driver status = AVAILABLE
     * 2. Assignment status = NOT_ASSIGNED
     *
     * This guarantees one truck can have only
     * ONE active route at a time.
     */

    const trucks =
      await Truck.find({

        status:
          "AVAILABLE",

        assignmentStatus:
          "NOT_ASSIGNED",

      })

      .populate(
        "depotId"
      );


    return res.status(200).json({

      message:
        "Eligible trucks fetched successfully",

      count:
        trucks.length,

      trucks,

    });


  } catch (error) {

    console.error(
      "GET AVAILABLE TRUCKS ERROR:",
      error
    );


    return res.status(500).json({

      message:
        "Failed to fetch eligible trucks",

      error:
        error.message,

    });

  }

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

  registerTruck,

  getMyTruck,

  getAllTrucks,

  updateTruckStatus,

  updatePhone,

  getAvailableTrucks,

};