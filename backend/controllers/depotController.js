const Depot = require("../models/Depot");
const Truck = require("../models/Truck");

const {
  fetchOSMFacilities,
} = require("../services/overpassService");


// =====================================================
// FETCH OSM FACILITIES
// =====================================================

const fetchDepots = async (req, res) => {

  try {

    const count =
      await fetchOSMFacilities();

    return res.status(200).json({

      message:
        "OSM facilities fetched successfully",

      count,

    });

  } catch (error) {

    console.error(
      "FETCH DEPOTS ERROR:",
      error
    );

    return res.status(500).json({

      message:
        "Failed to fetch OSM facilities",

      error:
        error.message,

    });

  }

};


// =====================================================
// GET ALL WASTE FACILITIES + REGISTERED TRUCKS
// =====================================================

const getAllDepots = async (req, res) => {

  try {

    const depots =
      await Depot.find({

        type: {
          $in: [
            "WASTE_TRANSFER_STATION",
            "WASTE_RELATED_INDUSTRIAL",
            "RECYCLING_CENTER",
            "LANDFILL",
            "WASTEWATER_PLANT",
          ],
        },

      })
      .sort({
        createdAt: 1,
      })
      .lean();


    // -----------------------------------------------
    // GET TRUCKS FOR EACH DEPOT
    // -----------------------------------------------

    for (const depot of depots) {

      const trucks =
        await Truck.find({

          depotId:
            depot._id,

        })

        // IMPORTANT:
        // Include phone here
        .populate(
          "userId",
          "name email phone"
        )

        .lean();


      depot.trucks = trucks;

    }


    // -----------------------------------------------
    // RESPONSE
    // -----------------------------------------------

    return res.status(200).json({

      count:
        depots.length,

      depots,

    });

  } catch (error) {

    console.error(
      "GET ALL DEPOTS ERROR:",
      error
    );

    return res.status(500).json({

      message:
        "Failed to fetch depots",

      error:
        error.message,

    });

  }

};


// =====================================================
// GET ONLY TRUCK DEPOTS
// =====================================================

const getTruckDepots = async (req, res) => {

  try {

    const depots =
      await Depot.find({

        isTruckDepot: true,

        status: "AVAILABLE",

      });


    return res.status(200).json({

      count:
        depots.length,

      depots,

    });

  } catch (error) {

    console.error(
      "GET TRUCK DEPOTS ERROR:",
      error
    );

    return res.status(500).json({

      message:
        "Failed to fetch truck depots",

      error:
        error.message,

    });

  }

};


// =====================================================
// UPDATE TRUCK DEPOT STATUS
// =====================================================

const updateDepotStatus = async (req, res) => {

  try {

    const {
      depotId,
    } = req.params;

    const {
      isTruckDepot,
    } = req.body;


    const depot =
      await Depot.findOneAndUpdate(

        {
          depotId,
        },

        {
          isTruckDepot,
        },

        {
          returnDocument: "after",
        }

      );


    if (!depot) {

      return res.status(404).json({

        message:
          "Depot not found",

      });

    }


    return res.status(200).json({

      message:
        "Truck depot status updated",

      depot,

    });

  } catch (error) {

    console.error(
      "UPDATE DEPOT STATUS ERROR:",
      error
    );

    return res.status(500).json({

      message:
        "Failed to update depot",

      error:
        error.message,

    });

  }

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

  fetchDepots,

  getAllDepots,

  getTruckDepots,

  updateDepotStatus,

};