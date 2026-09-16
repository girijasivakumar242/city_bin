const axios = require("axios");
const Depot = require("../models/Depot");


// ==================================================
// OVERPASS API
// ==================================================

const OVERPASS_URL =
  "https://overpass-api.de/api/interpreter";


// ==================================================
// OVERPASS QUERY
// ==================================================

const query = `
[out:json][timeout:120];

(
  /* ============================= */
  /* WASTE TRANSFER STATIONS */
  /* ============================= */

  node["amenity"="waste_transfer_station"]
    (10.85,76.85,11.15,77.15);

  way["amenity"="waste_transfer_station"]
    (10.85,76.85,11.15,77.15);

  relation["amenity"="waste_transfer_station"]
    (10.85,76.85,11.15,77.15);


  /* ============================= */
  /* RECYCLING CENTRES */
  /* ============================= */

  node["amenity"="recycling"]
    (10.85,76.85,11.15,77.15);

  way["amenity"="recycling"]
    (10.85,76.85,11.15,77.15);

  relation["amenity"="recycling"]
    (10.85,76.85,11.15,77.15);


  /* ============================= */
  /* LANDFILLS */
  /* ============================= */

  node["landuse"="landfill"]
    (10.85,76.85,11.15,77.15);

  way["landuse"="landfill"]
    (10.85,76.85,11.15,77.15);

  relation["landuse"="landfill"]
    (10.85,76.85,11.15,77.15);


  /* ============================= */
  /* WASTEWATER PLANTS */
  /* ============================= */

  node["man_made"="wastewater_plant"]
    (10.85,76.85,11.15,77.15);

  way["man_made"="wastewater_plant"]
    (10.85,76.85,11.15,77.15);

  relation["man_made"="wastewater_plant"]
    (10.85,76.85,11.15,77.15);


  /* ============================= */
  /* WASTE / TRUCK RELATED */
  /* ============================= */

  node["landuse"="industrial"]
    ["name"~"waste|garbage|solid waste|truck|municipal",i]
    (10.85,76.85,11.15,77.15);

  way["landuse"="industrial"]
    ["name"~"waste|garbage|solid waste|truck|municipal",i]
    (10.85,76.85,11.15,77.15);

  relation["landuse"="industrial"]
    ["name"~"waste|garbage|solid waste|truck|municipal",i]
    (10.85,76.85,11.15,77.15);
);

out center;
`;


// ==================================================
// FETCH OSM FACILITIES
// ==================================================

const fetchOSMFacilities = async () => {

  try {

    console.log("========================================");
    console.log("FETCHING FACILITIES FROM OVERPASS");
    console.log("========================================");


    const response = await axios.get(
      OVERPASS_URL,
      {
        params: {
          data: query,
        },

        headers: {
          "User-Agent":
            "CityBinWasteManagement/1.0",
        },

        timeout: 120000,
      }
    );


    const elements =
      response.data.elements || [];


    console.log(
      `Found ${elements.length} facilities`
    );


    let savedCount = 0;


    // ==========================================
    // PROCESS EACH FACILITY
    // ==========================================

    for (const element of elements) {

      let latitude;
      let longitude;


      // ========================================
      // NODE
      // ========================================

      if (element.type === "node") {

        latitude = element.lat;
        longitude = element.lon;

      }


      // ========================================
      // WAY / RELATION
      // ========================================

      else if (element.center) {

        latitude =
          element.center.lat;

        longitude =
          element.center.lon;

      }


      // ========================================
      // INVALID LOCATION
      // ========================================

      if (
        latitude === undefined ||
        longitude === undefined
      ) {

        console.log(
          `Skipping ${element.type}-${element.id}`
        );

        continue;
      }


      // ========================================
      // OSM TAGS
      // ========================================

      const tags =
        element.tags || {};


      // ========================================
      // DETERMINE FACILITY TYPE
      // ========================================

      let type = "OTHER";


      if (
        tags.amenity ===
        "waste_transfer_station"
      ) {

        type =
          "WASTE_TRANSFER_STATION";

      }

      else if (
        tags.amenity ===
        "recycling"
      ) {

        type =
          "RECYCLING_CENTER";

      }

      else if (
        tags.landuse ===
        "landfill"
      ) {

        type =
          "LANDFILL";

      }

      else if (
        tags.man_made ===
        "wastewater_plant"
      ) {

        type =
          "WASTEWATER_PLANT";

      }

      else if (
        tags.landuse ===
        "industrial"
      ) {

        type =
          "WASTE_RELATED_INDUSTRIAL";

      }


      // ========================================
      // OSM ID
      // ========================================

      const osmId =
        `${element.type}-${element.id}`;


      // ========================================
      // FACILITY NAME
      // ========================================

      const name =
        tags.name ||
        tags["name:en"] ||
        "Unnamed Facility";


      // ========================================
      // TRUCK DEPOT
      // ========================================
      //
      // Initially only waste transfer stations
      // are marked as truck depots.
      //
      // Admin can change this later.
      // ========================================

      const isTruckDepot = true;


      await Depot.findOneAndUpdate(

        {
          osmId:
            osmId,
        },

        {

          depotId:
            `DEPOT-${element.type}-${element.id}`,

          osmId:
            osmId,

          name:
            name,

          type:
            type,

          latitude:
            latitude,

          longitude:
            longitude,

          city:
            "Coimbatore",

          status:
            "AVAILABLE",

          isTruckDepot:
            isTruckDepot,

        },

        {
          upsert: true,
          returnDocument: "after",
        }

      );


      savedCount++;


      console.log(
        `Saved: ${name} | ${type} | ${latitude}, ${longitude}`
      );

    }


    // ==========================================
    // FINAL RESULT
    // ==========================================

    console.log("========================================");

    console.log(
      `${savedCount} facilities saved to MongoDB`
    );

    console.log("========================================");


    return savedCount;

  }


  // ============================================
  // ERROR HANDLING
  // ============================================

  catch (error) {

    console.error("========================================");
    console.error("OVERPASS ERROR");
    console.error("========================================");

    console.error(
      "Message:",
      error.message
    );


    if (error.response) {

      console.error(
        "Status:",
        error.response.status
      );

      console.error(
        "Response:",
        error.response.data
      );

    }


    console.error("========================================");


    throw error;

  }

};


// ==================================================
// EXPORT
// ==================================================

module.exports = {
  fetchOSMFacilities,
};