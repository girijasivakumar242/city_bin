const mongoose = require("mongoose");

const CollectionRequest = require("../models/CollectionRequest");

const {
  getEstimatedLoad,
} = require("../utils/routeUtils");

const Truck = require("../models/Truck");

const {
  optimizeCVRP,
  haversineDistance,
} = require("../utils/cvrpOptimizer");

const Route = require("../models/Route");
const Bin = require("../models/Bin");

const {
  getRoadRoute,
} = require("../services/roadRouteService");

// ============================================================
// CONFIGURATION
// ============================================================

// Maximum straight-line distance allowed between
// a bin and an eligible truck's depot.
const MAX_DEPOT_DISTANCE_KM = 20;

// Low-fill bins can be considered when collecting a mandatory
// bin only if they add little detour to the depot-to-bin path.
const OPTIONAL_MAX_DETOUR_KM = 2;

// Fill level at which a bin becomes a mandatory
// collection candidate.
const COLLECTION_THRESHOLD = 70;

let routeOptimizationPromise = null;

// ============================================================
// GET PENDING COLLECTION REQUESTS
// ============================================================

const getPendingRequests = async (req, res) => {
  try {
    const requests =
      await CollectionRequest.find({
        status: {
          $in: [
            "NOT_ASSIGNED",
            "PENDING",
          ],
        },
      }).populate("binId");

    const activeRequests = requests.filter(
      (request) =>
        Number(request.binId?.level) > 0 &&
        ["HIGH", "CRITICAL"].includes(
          request.priority
        )
    );

    const priorityOrder = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
    };

    activeRequests.sort(
      (a, b) =>
        priorityOrder[a.priority] -
        priorityOrder[b.priority]
    );

    return res.status(200).json({
      message:
        "Pending collection requests fetched successfully",

      count:
        activeRequests.length,

      requests: activeRequests,
    });
  } catch (error) {
    console.error(
      "GET PENDING REQUESTS ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch pending collection requests",

      error:
        error.message,
    });
  }
};

// ============================================================
// GET ROUTE PLANNING DATA
// ============================================================

const getRoutePlanningData = async (req, res) => {
  try {
    const requests =
      await CollectionRequest.find({
        status: {
          $in: [
            "NOT_ASSIGNED",
            "PENDING",
          ],
        },
      }).populate("binId");

    const activeRequests = requests.filter(
      (request) =>
        Number(request.binId?.level) > 0 &&
        ["HIGH", "CRITICAL"].includes(
          request.priority
        )
    );

    const trucks =
      await Truck.find({
        status: "AVAILABLE",
        assignmentStatus: "NOT_ASSIGNED",
      }).populate("depotId");

    const priorityOrder = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
    };

    activeRequests.sort(
      (a, b) =>
        priorityOrder[a.priority] -
        priorityOrder[b.priority]
    );

    const bins =
      activeRequests.map((request) => ({
        requestId:
          request._id,

        binId:
          request.binId.binId,

        latitude:
          request.binId.latitude,

        longitude:
          request.binId.longitude,

        level:
          request.binId.level,

        estimatedLoad:
          getEstimatedLoad(
            request.binId.level
          ),

        priority:
          request.priority,
      }));

    const availableTrucks =
      trucks.map((truck) => ({
        truckId:
          truck.truckId,

        truckNumber:
          truck.truckNumber,

        capacity:
          truck.capacity,

        depotId:
          truck.depotId.depotId,

        depotName:
          truck.depotId.name,

        depotLatitude:
          truck.depotId.latitude,

        depotLongitude:
          truck.depotId.longitude,
      }));

    return res.status(200).json({
      message:
        "Route planning data fetched successfully",

      count:
        bins.length,

      bins,

      trucks:
        availableTrucks,
    });
  } catch (error) {
    console.error(
      "GET ROUTE PLANNING DATA ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch route planning data",

      error:
        error.message,
    });
  }
};

// ============================================================
// RUN ROUTE OPTIMIZATION
//
// FLOW:
//
// MANDATORY PENDING BINS
//          ↓
// FIND NEARBY LOW-FILL OPTIONAL BINS
//          ↓
// FIND NEAREST ELIGIBLE DEPOT
//          ↓
// GROUP BINS DEPOT-WISE
//          ↓
// OR-TOOLS CVRP
//          ↓
// OSRM ACTUAL ROAD ROUTE
//          ↓
// SAVE ROUTE
//          ↓
// ASSIGN REQUESTS
//
// DRIVER STATUS:
// AVAILABLE / UNAVAILABLE
//       ↓
// MANUALLY CONTROLLED
//
// ASSIGNMENT STATUS:
// NOT_ASSIGNED / ASSIGNED
//       ↓
// SYSTEM CONTROLLED
// ============================================================

const runRouteOptimizationInternal = async () => {
  console.log(
    "================================================="
  );

  console.log(
    "STARTING DEPOT + CVRP + OPTIONAL BIN + OSRM OPTIMIZATION"
  );

  console.log(
    "================================================="
  );

  // ----------------------------------------------------------
  // 1. GET PENDING COLLECTION REQUESTS
  // ----------------------------------------------------------

  const fetchedRequests =
    await CollectionRequest.find({
      status: {
        $in: [
          "NOT_ASSIGNED",
          "PENDING",
        ],
      },
      }).populate("binId");

  const requestsByBin = new Map();
  const duplicateRequestIds = [];

  for (const request of fetchedRequests) {
    const binKey = request.binId?._id?.toString();

    if (!binKey) {
      continue;
    }

    const existingRequest = requestsByBin.get(binKey);

    if (
      !existingRequest ||
      request.priority === "CRITICAL" ||
      (request.priority === "HIGH" &&
        existingRequest.priority === "MEDIUM")
    ) {
      if (existingRequest) {
        duplicateRequestIds.push(existingRequest._id);
      }

      requestsByBin.set(binKey, request);
    } else {
      duplicateRequestIds.push(request._id);
    }
  }

  const requests = Array.from(requestsByBin.values());

  const zeroLevelRequestIds = requests
    .filter((request) => Number(request.binId?.level) <= 0)
    .map((request) => request._id);

  if (zeroLevelRequestIds.length > 0) {
    await CollectionRequest.updateMany(
      {
        _id: {
          $in: zeroLevelRequestIds,
        },
      },
      {
        $set: {
          status: "CANCELLED",
        },
      }
    );
  }

  const eligibleRequests = requests.filter(
    (request) =>
      Number(request.binId?.level) > 0 &&
      ["HIGH", "CRITICAL"].includes(
        request.priority
      )
  );

  const nonPriorityRequestIds = requests
    .filter(
      (request) =>
        !eligibleRequests.includes(request)
    )
    .map((request) => request._id);

  if (nonPriorityRequestIds.length > 0) {
    await CollectionRequest.updateMany(
      {
        _id: {
          $in: nonPriorityRequestIds,
        },
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

  requests.splice(
    0,
    requests.length,
    ...eligibleRequests
  );

  if (duplicateRequestIds.length > 0) {
    await CollectionRequest.updateMany(
      {
        _id: {
          $in: duplicateRequestIds,
        },
      },
      {
        $set: {
          status: "CANCELLED",
        },
      }
    );
  }

  if (requests.length === 0) {
    console.log(
      "No pending collection requests available"
    );

    return {
      success: false,

      message:
        "No pending collection requests available",

      totalBins:
        0,

      totalTrucksUsed:
        0,

      routes: [],

      savedRoutes: [],
    };
  }

  // ----------------------------------------------------------
  // 2. DEBUG ALL TRUCKS
  // ----------------------------------------------------------

  console.log(
    "================================================="
  );

  console.log(
    "TRUCK DATABASE DEBUG"
  );

  console.log(
    "================================================="
  );

  console.log(
    "MongoDB database:",
    mongoose.connection.name
  );

  const allTrucks =
    await Truck.find().lean();

  console.log(
    `Total trucks found in database: ${allTrucks.length}`
  );

  allTrucks.forEach((truck) => {
    console.log(
      `TRUCK: ${truck.truckId} | ` +
      `STATUS: [${truck.status}] | ` +
      `ASSIGNMENT: [${truck.assignmentStatus}] | ` +
      `DEPOT: ${truck.depotId}`
    );
  });

  console.log(
    "-------------------------------------------------"
  );

  // ----------------------------------------------------------
  // 3. GET ELIGIBLE TRUCKS
  // ----------------------------------------------------------

  const trucks =
    await Truck.find({
      status: "AVAILABLE",
      assignmentStatus: "NOT_ASSIGNED",
    }).populate("depotId");

  console.log(
    `ELIGIBLE TRUCKS FOUND: ${trucks.length}`
  );

  trucks.forEach((truck) => {
    console.log(
      `ELIGIBLE → ${truck.truckId} | ` +
      `STATUS: ${truck.status} | ` +
      `ASSIGNMENT: ${truck.assignmentStatus} | ` +
      `DEPOT: ${truck.depotId?.name || "NO DEPOT"}`
    );
  });

  console.log(
    "================================================="
  );

  if (trucks.length === 0) {
    console.log(
      "No available and unassigned trucks found"
    );

    return {
      success: false,

      message:
        "No available and unassigned trucks found",

      totalBins:
        requests.length,

      totalTrucksUsed:
        0,

      routes: [],

      savedRoutes: [],
    };
  }

  console.log(
    `Found ${requests.length} mandatory pending bins`
  );

  console.log(
    `Found ${trucks.length} eligible trucks`
  );

  // ----------------------------------------------------------
  // 4. PRIORITY ORDER
  // ----------------------------------------------------------

  const priorityOrder = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
  };

  requests.sort(
    (a, b) =>
      priorityOrder[a.priority] -
      priorityOrder[b.priority]
  );

  // ----------------------------------------------------------
  // 5. CONVERT ELIGIBLE TRUCKS
  // ----------------------------------------------------------

  const availableTrucks =
    trucks.map((truck) => ({
      truckId:
        truck.truckId,

      truckNumber:
        truck.truckNumber,

      capacity:
        truck.capacity,

      mongoTruckId:
        truck._id,

      depotId:
        truck.depotId.depotId,

      mongoDepotId:
        truck.depotId._id,

      depotName:
        truck.depotId.name,

      depotLatitude:
        Number(
          truck.depotId.latitude
        ),

      depotLongitude:
        Number(
          truck.depotId.longitude
        ),
    }));

  // ----------------------------------------------------------
  // 6. GET ALL BINS FOR OPTIONAL COLLECTION
  //
  // Mandatory bins come from PENDING requests.
  //
  // Optional bins come from Bin collection and must:
  //
  // - be below threshold
  // - not already have an active request
  // - be close to a mandatory bin
  // ----------------------------------------------------------

  const allBins =
    await Bin.find().lean();

  // Get all bins which already have active collection
  // requests so we don't create duplicate work.
  const activeRequests =
    await CollectionRequest.find({
      status: {
        $in: [
          "NOT_ASSIGNED",
          "PENDING",
          "ASSIGNED",
        ],
      },
    }).lean();

  const activeBinIds =
    new Set(
      activeRequests.map(
        (request) =>
          request.binId?.toString()
      )
    );

  // ----------------------------------------------------------
  // Create a set of mandatory bin IDs
  // ----------------------------------------------------------

  const mandatoryBinIds =
    new Set(
      requests
        .filter(
          (request) =>
            request.binId
        )
        .map(
          (request) =>
            request.binId._id.toString()
        )
    );

  // ----------------------------------------------------------
  // Find optional low-fill bins
  // ----------------------------------------------------------

  const optionalBins = [];

  for (const candidate of allBins) {
    if (!candidate) {
      continue;
    }

    // Don't consider mandatory bins again.
    if (
      mandatoryBinIds.has(
        candidate._id.toString()
      )
    ) {
      continue;
    }

    // Don't consider bins that already have
    // pending/assigned collection requests.
    if (
      activeBinIds.has(
        candidate._id.toString()
      )
    ) {
      continue;
    }

    const level =
      Number(candidate.level) || 0;

    // Only below-threshold bins are optional.
    if (
      level >= COLLECTION_THRESHOLD
    ) {
      continue;
    }

    // Ignore completely empty bins.
    if (level <= 0) {
      continue;
    }

    // --------------------------------------------------------
    // Check the candidate against each depot-to-mandatory path.
    // A low-fill bin is eligible only when adding it creates
    // no more than the configured detour.
    // --------------------------------------------------------

    let smallestDetourKm =
      Infinity;

    let nearestMandatoryBinId =
      null;

    for (const request of requests) {
      const mandatoryBin =
        request.binId;

      if (!mandatoryBin) {
        continue;
      }

      for (const truck of availableTrucks) {
        const depotToMandatoryKm =
          haversineDistance(
            truck.depotLatitude,
            truck.depotLongitude,
            Number(mandatoryBin.latitude),
            Number(mandatoryBin.longitude)
          ) / 1000;

        const depotToOptionalKm =
          haversineDistance(
            truck.depotLatitude,
            truck.depotLongitude,
            Number(candidate.latitude),
            Number(candidate.longitude)
          ) / 1000;

        const optionalToMandatoryKm =
          haversineDistance(
            Number(candidate.latitude),
            Number(candidate.longitude),
            Number(mandatoryBin.latitude),
            Number(mandatoryBin.longitude)
          ) / 1000;

        const detourKm =
          depotToOptionalKm +
          optionalToMandatoryKm -
          depotToMandatoryKm;

        const optionalIsOnTheWay =
          depotToOptionalKm <=
          depotToMandatoryKm;

        if (
          optionalIsOnTheWay &&
          detourKm < smallestDetourKm
        ) {
          smallestDetourKm = detourKm;

        nearestMandatoryBinId =
          mandatoryBin.binId;
        }
      }
    }

    if (
      smallestDetourKm <=
      OPTIONAL_MAX_DETOUR_KM
    ) {
      optionalBins.push({
        binId:
          candidate.binId,

        mongoBinId:
          candidate._id,

        latitude:
          Number(candidate.latitude),

        longitude:
          Number(candidate.longitude),

        level,

        estimatedLoad:
          getEstimatedLoad(level),

        // Optional bins use MEDIUM as their
        // normal waste priority.
        //
        // isOptional tells the next CVRP update
        // that this bin is not mandatory.
        priority:
          "MEDIUM",

        isOptional:
          true,

        nearestMandatoryBinId,

        distanceFromMandatoryKm:
          Number(
            smallestDetourKm.toFixed(2)
          ),
      });
    }
  }

  console.log(
    "================================================="
  );

  console.log(
    "OPTIONAL LOW-FILL BIN ANALYSIS"
  );

  console.log(
    "================================================="
  );

  console.log(
    `Mandatory bins: ${requests.length}`
  );

  console.log(
    `Optional nearby bins found: ${optionalBins.length}`
  );

  optionalBins.forEach((bin) => {
    console.log(
      `OPTIONAL → ${bin.binId} | ` +
      `LEVEL: ${bin.level}% | ` +
      `LOAD: ${bin.estimatedLoad} kg | ` +
      `NEAR: ${bin.nearestMandatoryBinId} | ` +
      `DISTANCE: ${bin.distanceFromMandatoryKm} km`
    );
  });

  // ----------------------------------------------------------
  // 7. GROUP MANDATORY BINS BY NEAREST ELIGIBLE DEPOT
  // ----------------------------------------------------------

  const depotGroups =
    new Map();

  const unassignedBins =
    [];

  for (const request of requests) {
    const bin =
      request.binId;

    if (!bin) {
      continue;
    }

    const binLatitude =
      Number(bin.latitude);

    const binLongitude =
      Number(bin.longitude);

    const possibleDepots =
      availableTrucks
        .map((truck) => {
          const distanceMeters =
            haversineDistance(
              binLatitude,
              binLongitude,
              truck.depotLatitude,
              truck.depotLongitude
            );

          return {
            truck,

            distanceMeters,

            distanceKm:
              distanceMeters / 1000,
          };
        })
        .sort(
          (a, b) =>
            a.distanceMeters -
            b.distanceMeters
        );

    const nearest =
      possibleDepots.find(
        (item) =>
          item.distanceKm <=
          MAX_DEPOT_DISTANCE_KM
      );

    if (!nearest) {
      console.log(
        `NO NEARBY DEPOT: ${bin.binId} is outside ${MAX_DEPOT_DISTANCE_KM} km`
      );

      unassignedBins.push({
        request,

        reason:
          "No eligible depot within allowed distance",
      });

      continue;
    }

    const selectedTruck =
      nearest.truck;

    console.log(
      `MANDATORY BIN ${bin.binId} → ${selectedTruck.depotName} (${nearest.distanceKm.toFixed(
        2
      )} km)`
    );

    if (
      !depotGroups.has(
        selectedTruck.depotId
      )
    ) {
      depotGroups.set(
        selectedTruck.depotId,
        {
          depot:
            selectedTruck,

          bins: [],

          trucks: [],
        }
      );
    }

    const group =
      depotGroups.get(
        selectedTruck.depotId
      );

    group.bins.push({
      requestId:
        request._id.toString(),

      binId:
        bin.binId,

      mongoBinId:
        bin._id,

      latitude:
        bin.latitude,

      longitude:
        bin.longitude,

      level:
        bin.level,

      estimatedLoad:
        getEstimatedLoad(
          bin.level
        ),

      priority:
        request.priority,

      isOptional:
        false,
    });
  }

  // ----------------------------------------------------------
  // 8. ADD OPTIONAL BINS TO DEPOT GROUPS
  //
  // An optional bin is added to the same depot group
  // if it is close to a mandatory bin belonging to that group.
  // ----------------------------------------------------------

  for (const optionalBin of optionalBins) {
    let bestGroup = null;

    let bestDistance =
      Infinity;

    for (
      const [
        depotId,
        group
      ] of depotGroups
    ) {
      for (
        const mandatoryBin of group.bins
      ) {
        if (
          mandatoryBin.isOptional
        ) {
          continue;
        }

        const distanceMeters =
          haversineDistance(
            optionalBin.latitude,
            optionalBin.longitude,
            Number(mandatoryBin.latitude),
            Number(mandatoryBin.longitude)
          );

        const distanceKm =
          distanceMeters / 1000;

        if (
          mandatoryBin.binId ===
            optionalBin.nearestMandatoryBinId &&
          distanceKm < bestDistance
        ) {
          bestDistance =
            distanceKm;

          bestGroup = {
            depotId,

            group,
          };
        }
      }
    }

    if (!bestGroup) {
      console.log(
        `OPTIONAL BIN IGNORED: ${optionalBin.binId} has no suitable mandatory route`
      );

      continue;
    }

    bestGroup.group.bins.push({
      requestId:
        null,

      binId:
        optionalBin.binId,

      mongoBinId:
        optionalBin.mongoBinId,

      latitude:
        optionalBin.latitude,

      longitude:
        optionalBin.longitude,

      level:
        optionalBin.level,

      estimatedLoad:
        optionalBin.estimatedLoad,

      priority:
        optionalBin.priority,

      isOptional:
        true,
    });

    console.log(
      `OPTIONAL BIN ADDED → ${optionalBin.binId} | ` +
      `DEPOT: ${bestGroup.group.depot.depotName} | ` +
      `DISTANCE FROM ROUTE BIN: ${bestDistance.toFixed(
        2
      )} km`
    );
  }

  // ----------------------------------------------------------
  // 9. ADD ALL ELIGIBLE TRUCKS TO THEIR DEPOT GROUP
  // ----------------------------------------------------------

  for (
    const truck of availableTrucks
  ) {
    if (
      depotGroups.has(
        truck.depotId
      )
    ) {
      const group =
        depotGroups.get(
          truck.depotId
        );

      group.trucks.push(
        truck
      );
    }
  }

  // ----------------------------------------------------------
  // 10. DISPLAY DEPOT-WISE ASSIGNMENT
  // ----------------------------------------------------------

  console.log(
    "================================================="
  );

  console.log(
    "DEPOT-WISE BIN ASSIGNMENT"
  );

  console.log(
    "================================================="
  );

  for (
    const [
      depotId,
      group
    ] of depotGroups
  ) {
    console.log(
      `DEPOT: ${group.depot.depotName}`
    );

    console.log(
      `BINS: ${group.bins.length}`
    );

    console.log(
      `TRUCKS: ${group.trucks.length}`
    );

    console.log(
      "-------------------------------------------------"
    );

    group.bins.forEach(
      (bin) => {
        console.log(
          `${bin.isOptional ? "OPTIONAL" : "MANDATORY"} BIN: ${
            bin.binId
          } | ` +
          `LEVEL: ${bin.level}% | ` +
          `PRIORITY: ${bin.priority} | ` +
          `LOAD: ${bin.estimatedLoad} kg`
        );
      }
    );
  }

  // ----------------------------------------------------------
  // 11. RUN OR-TOOLS SEPARATELY FOR EACH DEPOT
  // ----------------------------------------------------------

  const savedRoutes =
    [];

  const allOptimizedRoutes =
    [];

  for (
    const [
      depotId,
      group
    ] of depotGroups
  ) {
    if (
      group.bins.length === 0
    ) {
      continue;
    }

    if (
      group.trucks.length === 0
    ) {
      console.log(
        `NO TRUCK AVAILABLE AT DEPOT: ${group.depot.depotName}`
      );

      continue;
    }

    console.log(
      "-------------------------------------------------"
    );

    console.log(
      `OPTIMIZING DEPOT: ${group.depot.depotName}`
    );

    console.log(
      `Bins: ${group.bins.length}`
    );

    console.log(
      `Trucks: ${group.trucks.length}`
    );

    // --------------------------------------------------------
    // OR-TOOLS CVRP
    // --------------------------------------------------------

    const result =
      await optimizeCVRP(
        group.bins,
        group.trucks
      );

    console.log(
      `OR-TOOLS COMPLETED FOR ${group.depot.depotName}`
    );

    // --------------------------------------------------------
    // PROCESS EACH OPTIMIZED TRUCK ROUTE
    // --------------------------------------------------------

    for (
      const optimizedRoute
      of result.routes
    ) {
      console.log(
        "-------------------------------------------------"
      );

      console.log(
        `Processing route for truck: ${optimizedRoute.truckId}`
      );

      // ------------------------------------------------------
      // CREATE ROUTE ID
      // ------------------------------------------------------

      const routeId =
        `ROUTE-${Date.now()}-${Math.floor(
          Math.random() * 1000
        )}`;

      // ------------------------------------------------------
      // CREATE ROUTE BIN ARRAY
      // ------------------------------------------------------

      const routeBins =
        [];

      for (
        let i = 0;
        i < optimizedRoute.bins.length;
        i++
      ) {
        const optimizedBin =
          optimizedRoute.bins[i];

        const bin =
          await Bin.findOne({
            binId:
              optimizedBin.binId,
          });

        if (!bin) {
          console.log(
            `Bin not found: ${optimizedBin.binId}`
          );

          continue;
        }

        const sourceBin =
          group.bins.find(
            (item) =>
              item.binId ===
              optimizedBin.binId
          );

        routeBins.push({
          binId:
            bin._id,

          sequence:
            i + 1,

          estimatedLoad:
            optimizedBin.estimatedLoad,

          priority:
            optimizedBin.priority,

          collectionStatus:
            "PENDING",

          collectedAt:
            null,

          // This property is useful internally,
          // but if your Route schema does not contain
          // it, Mongoose will ignore it.
          isOptional:
            sourceBin?.isOptional || false,
        });
      }

      // ------------------------------------------------------
      // BUILD OSRM LOCATIONS
      // ------------------------------------------------------

      const roadLocations =
        [
          {
            name:
              optimizedRoute.depotName,

            type:
              "DEPOT",

            latitude:
              optimizedRoute.depotLatitude,

            longitude:
              optimizedRoute.depotLongitude,
          },
        ];

      for (
        let i = 0;
        i < optimizedRoute.bins.length;
        i++
      ) {
        const optimizedBin =
          optimizedRoute.bins[i];

        const bin =
          await Bin.findOne({
            binId:
              optimizedBin.binId,
          });

        if (!bin) {
          continue;
        }

        roadLocations.push({
          name:
            bin.area ||
            bin.binId,

          type:
            "BIN",

          binId:
            bin.binId,

          latitude:
            bin.latitude,

          longitude:
            bin.longitude,

          priority:
            optimizedBin.priority,
        });
      }

      console.log(
        "ROAD ROUTE LOCATIONS:"
      );

      console.log(
        roadLocations
      );

      // ------------------------------------------------------
      // OSRM ROAD ROUTING
      // ------------------------------------------------------

      let roadRoute =
        null;

      if (
        roadLocations.length >= 2
      ) {
        try {
          roadRoute =
            await getRoadRoute(
              roadLocations
            );

          console.log(
            "ROAD ROUTE FOUND"
          );

          console.log(
            `Road distance: ${roadRoute.distanceKm} km`
          );

          console.log(
            `Road duration: ${roadRoute.durationSeconds} seconds`
          );
        } catch (roadError) {
          console.error(
            "OSRM ROAD ROUTING FAILED:",
            roadError.message
          );

          roadRoute =
            null;
        }
      }

      // ------------------------------------------------------
      // CREATE SAVED ROUTE DATA
      // ------------------------------------------------------

      const savedRouteData = {
        routeId,

        truckId:
          optimizedRoute.mongoTruckId,

        depotId:
          optimizedRoute.mongoDepotId,

        bins:
          routeBins,

        totalLoad:
          optimizedRoute.totalLoad,

        truckCapacity:
          optimizedRoute.capacity,

        remainingCapacity:
          optimizedRoute.remainingCapacity,

        totalDistanceKm:
          optimizedRoute.totalDistanceKm,

        status:
          "ASSIGNED",
      };

      // ------------------------------------------------------
      // ADD OSRM DATA
      // ------------------------------------------------------

      if (roadRoute) {
        savedRouteData.roadDistanceKm =
          roadRoute.distanceKm;

        savedRouteData.roadDurationMinutes =
          Number(
            (
              roadRoute.durationSeconds /
              60
            ).toFixed(1)
          );

        savedRouteData.roadGeometry =
          roadRoute.geometry;

        savedRouteData.driverSteps =
          roadRoute.steps.map(
            (step, index) => ({
              sequence:
                index + 1,

              roadName:
                step.roadName,

              distanceMeters:
                step.distanceMeters,

              durationSeconds:
                step.durationSeconds,

              maneuver:
                step.maneuver,

              modifier:
                step.modifier,

              location:
                step.location,
            })
          );

        savedRouteData.routeLocations =
          roadLocations.map(
            (location, index) => ({
              sequence:
                index + 1,

              name:
                location.name,

              type:
                location.type,

              binId:
                location.binId ||
                null,

              latitude:
                location.latitude,

              longitude:
                location.longitude,

              priority:
                location.priority ||
                null,
            })
          );
      }

      // ------------------------------------------------------
      // SAVE ROUTE
      // ------------------------------------------------------

      // Claim the truck atomically so concurrent optimizations
      // cannot assign a second active route to the same truck.
      const claimedTruck =
        await Truck.findOneAndUpdate(
          {
            _id:
              optimizedRoute.mongoTruckId,

            status:
              "AVAILABLE",

            assignmentStatus:
              "NOT_ASSIGNED",
          },
          {
            $set: {
              assignmentStatus:
                "ASSIGNED",
            },
          },
          {
            returnDocument: "after",
          }
        );

      if (!claimedTruck) {
        console.log(
          `Truck ${optimizedRoute.truckId} was assigned while this route was being created`
        );

        continue;
      }

      const savedRoute =
        await Route.create(
          savedRouteData
        );

      savedRoutes.push(
        savedRoute
      );

      allOptimizedRoutes.push(
        optimizedRoute
      );

      console.log(
        `Route ${routeId} saved for ${optimizedRoute.truckId}`
      );

      // ------------------------------------------------------
      // ASSIGN COLLECTION REQUESTS
      //
      // IMPORTANT:
      // Optional bins DON'T have collection requests.
      // Only mandatory bins are updated here.
      // ------------------------------------------------------

      for (
        const optimizedBin
        of optimizedRoute.bins
      ) {
        const request =
          requests.find(
            (req) =>
              req.binId.binId ===
              optimizedBin.binId
          );

        if (!request) {
          // Optional bin
          continue;
        }

        request.status =
          "ASSIGNED";

        request.assignedTruckId =
          optimizedRoute.mongoTruckId;

        request.assignedRouteId =
          savedRoute._id;

        await request.save();

        console.log(
          `Request ${request._id} assigned to ${optimizedRoute.truckId}`
        );
      }

      // ------------------------------------------------------
      // UPDATE ONLY ASSIGNMENT STATUS
      //
      // IMPORTANT:
      // DO NOT change driver status.
      //
      // Driver status:
      // AVAILABLE / UNAVAILABLE
      //
      // Assignment status:
      // ASSIGNED
      // ------------------------------------------------------

      console.log(
        `Truck ${optimizedRoute.truckId} assignmentStatus = ASSIGNED`
      );
    }
  }

  // ----------------------------------------------------------
  // 12. UNASSIGNED BIN INFORMATION
  // ----------------------------------------------------------

  if (
    unassignedBins.length > 0
  ) {
    console.log(
      "================================================="
    );

    console.log(
      `${unassignedBins.length} bin(s) could not be assigned`
    );

    unassignedBins.forEach(
      (item) => {
        console.log(
          `Bin: ${item.request.binId.binId} | Reason: ${item.reason}`
        );
      }
    );
  }

  // ----------------------------------------------------------
  // 13. FINAL RESULT
  // ----------------------------------------------------------

  return {
    success:
      true,

    message:
      "Depot + CVRP + optional nearby bins + OSRM routes generated successfully",

    optimization: {
      totalBins:
        requests.length,

      optionalBinsConsidered:
        optionalBins.length,

      totalTrucksUsed:
        allOptimizedRoutes.length,
    },

    routes:
      allOptimizedRoutes,

    savedRoutes:
      savedRoutes,

    unassignedBins:
      unassignedBins.map(
        (item) => ({
          requestId:
            item.request._id,

          binId:
            item.request.binId.binId,

          reason:
            item.reason,
        })
      ),
  };
};

const runRouteOptimization = async () => {
  if (routeOptimizationPromise) {
    console.log(
      "Route optimization already running; skipping overlapping run"
    );

    return {
      success: false,
      message: "Route optimization already in progress",
      totalBins: 0,
      totalTrucksUsed: 0,
      routes: [],
      savedRoutes: [],
    };
  }

  routeOptimizationPromise = runRouteOptimizationInternal();

  try {
    return await routeOptimizationPromise;
  } finally {
    routeOptimizationPromise = null;
  }
};

// ============================================================
// POST /api/routes/optimize
// ============================================================

const optimizeRoutes = async (
  req,
  res
) => {
  try {
    const result =
      await runRouteOptimization();

    if (
      !result.success &&
      result.totalBins === 0
    ) {
      return res.status(400).json({
        message:
          result.message,
      });
    }

    if (
      !result.success &&
      result.totalTrucksUsed === 0
    ) {
      return res.status(400).json({
        message:
          result.message,
      });
    }

    return res.status(200).json(
      result
    );
  } catch (error) {
    console.error(
      "OPTIMIZE ROUTES ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Route optimization failed",

      error:
        error.message,
    });
  }
};

// ============================================================
// GET ALL SAVED ROUTES
// ============================================================

const getSavedRoutes = async (
  req,
  res
) => {
  try {
    const routes =
      await Route.find()
        .populate("truckId")
        .populate("depotId")
        .populate("bins.binId")
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      message:
        "Saved routes fetched successfully",

      count:
        routes.length,

      routes,
    });
  } catch (error) {
    console.error(
      "GET SAVED ROUTES ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch saved routes",

      error:
        error.message,
    });
  }
};

// ============================================================
// COLLECT ROUTE BIN
// ============================================================

const collectRouteBin = async (req, res) => {
  try {
    const { routeId, binId } = req.params;

    if (!routeId || !binId) {
      return res.status(400).json({
        message: "routeId and binId are required",
      });
    }

    // =====================================================
    // FIND ROUTE
    // =====================================================

    const route = await Route.findOne({
      routeId,
    });

    if (!route) {
      return res.status(404).json({
        message: "Route not found",
      });
    }

    const truck = await Truck.findById(route.truckId);

    if (!truck) {
      return res.status(404).json({
        message: "Truck assigned to this route not found",
      });
    }

    if (
      req.user &&
      req.user.userId &&
      truck.userId.toString() !==
        req.user.userId.toString()
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to collect bins on this route",
      });
    }

    // =====================================================
    // ROUTE MUST STILL BE ACTIVE
    // =====================================================

    if (route.status === "COMPLETED") {
      return res.status(400).json({
        message: "This route has already been completed",
      });
    }

    // =====================================================
    // FIND BIN INSIDE ROUTE
    // =====================================================

    const routeBin = route.bins.find(
      (item) =>
        item.binId.toString() === binId
    );

    if (!routeBin) {
      return res.status(404).json({
        message:
          "This bin is not assigned to this route",
      });
    }

    // =====================================================
    // CHECK ALREADY COLLECTED
    // =====================================================

    if (
      routeBin.collectionStatus === "COLLECTED"
    ) {
      return res.status(400).json({
        message:
          "This bin has already been collected",
      });
    }

    // =====================================================
    // MARK ROUTE BIN AS COLLECTED
    // =====================================================

    routeBin.collectionStatus = "COLLECTED";

    routeBin.collectedAt = new Date();

    // =====================================================
    // RESET ACTUAL BIN
    // =====================================================

    const bin =
      await Bin.findOneAndUpdate(
        {
          _id: binId,
        },
        {
          level: 0,
          status: "Available",
        },
        {
          returnDocument: "after",
        }
      );

    if (!bin) {
      return res.status(404).json({
        message: "Actual bin not found",
      });
    }

    // =====================================================
    // UPDATE COLLECTION REQUEST
    // =====================================================

    const collectionRequest =
      await CollectionRequest.findOne({
        binId: bin._id,
        assignedRouteId: route._id,
        status: "ASSIGNED",
      });

    if (collectionRequest) {
      collectionRequest.status = "COLLECTED";
      collectionRequest.collectedAt = new Date();

      await collectionRequest.save();
    }

    // =====================================================
    // CHECK WHETHER ALL BINS ARE COLLECTED
    // =====================================================

    const allCollected =
      route.bins.every(
        (item) =>
          item.collectionStatus ===
          "COLLECTED"
      );

    // =====================================================
    // IMPORTANT
    //
    // EVEN IF ALL BINS ARE COLLECTED,
    // TRUCK MUST REMAIN ASSIGNED.
    //
    // DRIVER STILL HAS TO RETURN TO DEPOT.
    // =====================================================

    if (allCollected) {
      route.status = "COMPLETED";

      await route.save();

      await CollectionRequest.updateMany(
        {
          assignedRouteId:
            route._id,

          status: {
            $in: [
              "ASSIGNED",
              "COLLECTED",
            ],
          },
        },
        {
          $set: {
            status: "COLLECTED",
            collectedAt: new Date(),
          },
        }
      );

      truck.assignmentStatus =
        "NOT_ASSIGNED";

      await truck.save();

      return res.status(200).json({
        message:
          "All bins collected. Route completed and truck released.",

        bin: {
          binId: bin.binId,
          level: bin.level,
          status: bin.status,
        },

        routeBin: {
          binId,
          collectionStatus:
            routeBin.collectionStatus,
          collectedAt:
            routeBin.collectedAt,
        },

        allBinsCollected: true,

        routeStatus:
          route.status,

        assignmentStatus:
          truck.assignmentStatus,
      });
    }

    // =====================================================
    // NOT ALL BINS COLLECTED
    // =====================================================

    await route.save();

    return res.status(200).json({
      message:
        "Bin collected successfully",

      bin: {
        binId: bin.binId,
        level: bin.level,
        status: bin.status,
      },

      routeBin: {
        binId,
        collectionStatus:
          routeBin.collectionStatus,
        collectedAt:
          routeBin.collectedAt,
      },

      allBinsCollected: false,

      routeStatus:
        route.status,

      assignmentStatus:
        truck.assignmentStatus,
    });

  } catch (error) {
    console.error(
      "COLLECT ROUTE BIN ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to collect bin",

      error:
        error.message,
    });
  }
};

// ============================================================
// COMPLETE ROUTE / RETURN TO DEPOT
// ============================================================

const completeRoute = async (req, res) => {
  try {
    const { routeId } = req.params;

    if (!routeId) {
      return res.status(400).json({
        message: "routeId is required",
      });
    }

    // =====================================================
    // FIND ROUTE
    // =====================================================

    const route =
      await Route.findOne({
        routeId,
      });

    if (!route) {
      return res.status(404).json({
        message: "Route not found",
      });
    }

    // =====================================================
    // CHECK ROUTE ALREADY COMPLETED
    // =====================================================

    if (
      route.status === "COMPLETED"
    ) {
      return res.status(400).json({
        message:
          "This route is already completed",
      });
    }

    // =====================================================
    // CHECK ALL BINS ARE COLLECTED
    // =====================================================

    const allCollected =
      route.bins.length > 0 &&
      route.bins.every(
        (item) =>
          item.collectionStatus ===
          "COLLECTED"
      );

    if (!allCollected) {
      return res.status(400).json({
        message:
          "Cannot complete route. All assigned bins must be collected first.",
      });
    }

    // =====================================================
    // FIND TRUCK
    // =====================================================

    const truck =
      await Truck.findById(
        route.truckId
      );

    if (!truck) {
      return res.status(404).json({
        message:
          "Truck assigned to this route not found",
      });
    }

    // =====================================================
    // SECURITY CHECK
    //
    // Only the driver who owns this truck
    // should be able to complete the route.
    // =====================================================

    if (
      req.user &&
      req.user.userId &&
      truck.userId.toString() !==
        req.user.userId.toString()
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to complete this route",
      });
    }

    // =====================================================
    // COMPLETE ROUTE
    // =====================================================

    route.status = "COMPLETED";

    await route.save();

    // =====================================================
    // UPDATE COLLECTION REQUESTS
    // =====================================================

    await CollectionRequest.updateMany(
      {
        assignedRouteId:
          route._id,

        status: {
          $in: [
            "ASSIGNED",
            "COLLECTED",
          ],
        },
      },
      {
        $set: {
          status: "COLLECTED",
          collectedAt: new Date(),
        },
      }
    );

    // =====================================================
    // IMPORTANT
    //
    // ONLY ASSIGNMENT STATUS CHANGES.
    //
    // DRIVER AVAILABILITY DOES NOT CHANGE.
    // =====================================================

    truck.assignmentStatus =
      "NOT_ASSIGNED";

    await truck.save();

    console.log(
      "================================================="
    );

    console.log(
      `ROUTE COMPLETED: ${route.routeId}`
    );

    console.log(
      `TRUCK: ${truck.truckId}`
    );

    console.log(
      `TRUCK STATUS: ${truck.status}`
    );

    console.log(
      `TRUCK ASSIGNMENT STATUS: ${truck.assignmentStatus}`
    );

    console.log(
      "Truck is now eligible for next route only if status = AVAILABLE"
    );

    console.log(
      "================================================="
    );

    return res.status(200).json({
      message:
        "Route completed successfully. Truck is now ready for the next assignment.",

      route: {
        routeId:
          route.routeId,

        status:
          route.status,
      },

      truck: {
        truckId:
          truck.truckId,

        status:
          truck.status,

        assignmentStatus:
          truck.assignmentStatus,
      },

      readyForNextAssignment:
        truck.status === "AVAILABLE" &&
        truck.assignmentStatus ===
          "NOT_ASSIGNED",
    });

  } catch (error) {
    console.error(
      "COMPLETE ROUTE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to complete route",

      error:
        error.message,
    });
  }
};

module.exports = {
  getPendingRequests,

  getRoutePlanningData,

  runRouteOptimization,

  optimizeRoutes,

  getSavedRoutes,
  collectRouteBin,
  completeRoute,
};