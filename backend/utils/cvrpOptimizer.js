const {
  initRouting,
  RoutingIndexManager,
  RoutingModel,
  DefaultRoutingSearchParameters,
  FirstSolutionStrategy,
  LocalSearchMetaheuristic,
} = require("or-tools-wasm/routing");

// ----------------------------------------------------
// Haversine distance
// Returns distance in meters
// ----------------------------------------------------
const haversineDistance = (
  lat1,
  lon1,
  lat2,
  lon2
) => {
  const R = 6371000;

  const toRadians = (degree) => {
    return (degree * Math.PI) / 180;
  };

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
};

// ----------------------------------------------------
// CVRP OPTIMIZER
//
// MANDATORY BINS:
//   isOptional === false
//   → MUST be collected
//
// OPTIONAL BINS:
//   isOptional === true
//   → OR-Tools may skip them
//
// Truck allocation and stop sequence are decided
// by OR-Tools.
//
// OSRM road routing is handled separately.
// ----------------------------------------------------
const optimizeCVRP = async (
  bins,
  trucks
) => {
  await initRouting();

  // --------------------------------------------------
  // VALIDATE BINS
  // --------------------------------------------------

  if (
    !bins ||
    bins.length === 0
  ) {
    throw new Error(
      "No bins available for route optimization"
    );
  }

  // --------------------------------------------------
  // VALIDATE TRUCKS
  // --------------------------------------------------

  if (
    !trucks ||
    trucks.length === 0
  ) {
    throw new Error(
      "No available trucks for route optimization"
    );
  }

  // --------------------------------------------------
  // CREATE LOCATIONS
  // --------------------------------------------------

  const locations = [];

  // --------------------------------------------------
  // ADD DEPOTS
  // --------------------------------------------------

  trucks.forEach(
    (truck) => {
      locations.push({
        type: "DEPOT",

        truckId:
          truck.truckId,

        latitude:
          Number(
            truck.depotLatitude
          ),

        longitude:
          Number(
            truck.depotLongitude
          ),
      });
    }
  );

  // --------------------------------------------------
  // ADD BINS
  // --------------------------------------------------

  bins.forEach(
    (bin) => {
      locations.push({
        type: "BIN",

        binId:
          bin.binId,

        latitude:
          Number(
            bin.latitude
          ),

        longitude:
          Number(
            bin.longitude
          ),

        estimatedLoad:
          Number(
            bin.estimatedLoad
          ),

        priority:
          bin.priority,

        // VERY IMPORTANT
        //
        // false = mandatory
        // true  = optional
        //
        isOptional:
          bin.isOptional === true,
      });
    }
  );

  const numLocations =
    locations.length;

  const numVehicles =
    trucks.length;

  // --------------------------------------------------
  // START / END DEPOTS
  // --------------------------------------------------

  const starts =
    trucks.map(
      (truck, index) =>
        index
    );

  const ends =
    trucks.map(
      (truck, index) =>
        index
    );

  // --------------------------------------------------
  // ROUTING INDEX MANAGER
  // --------------------------------------------------

  const manager =
    new RoutingIndexManager(
      numLocations,
      numVehicles,
      starts,
      ends
    );

  // --------------------------------------------------
  // ROUTING MODEL
  // --------------------------------------------------

  const routing =
    new RoutingModel(
      manager
    );

  // --------------------------------------------------
  // DISTANCE CALLBACK
  // --------------------------------------------------

  const distanceCallback =
    routing.RegisterTransitCallback(
      (
        fromIndex,
        toIndex
      ) => {
        const fromNode =
          manager.IndexToNode(
            fromIndex
          );

        const toNode =
          manager.IndexToNode(
            toIndex
          );

        const from =
          locations[fromNode];

        const to =
          locations[toNode];

        const distance =
          haversineDistance(
            from.latitude,
            from.longitude,
            to.latitude,
            to.longitude
          );

        return Math.round(
          distance
        );
      }
    );

  // --------------------------------------------------
  // MINIMIZE DISTANCE
  // --------------------------------------------------

  routing.SetArcCostEvaluatorOfAllVehicles(
    distanceCallback
  );

  // --------------------------------------------------
  // WASTE DEMAND CALLBACK
  // --------------------------------------------------

  const demandCallback =
    routing.RegisterUnaryTransitCallback(
      (fromIndex) => {
        const node =
          manager.IndexToNode(
            fromIndex
          );

        const location =
          locations[node];

        if (
          location.type ===
          "DEPOT"
        ) {
          return 0;
        }

        return Math.round(
          location.estimatedLoad
        );
      }
    );

  // --------------------------------------------------
  // TRUCK CAPACITY
  // --------------------------------------------------

  const vehicleCapacities =
    trucks.map(
      (truck) =>
        Math.round(
          truck.capacity
        )
    );

  routing.AddDimensionWithVehicleCapacity(
    demandCallback,
    0,
    vehicleCapacities,
    true,
    "Capacity"
  );

  // --------------------------------------------------
  // OPTIONAL BIN PENALTIES
  //
  // ONLY OPTIONAL BINS GET DISJUNCTIONS.
  //
  // Mandatory bins are NOT given disjunctions.
  // Therefore OR-Tools cannot simply drop them.
  // --------------------------------------------------

  const optionalPenalty = {
    CRITICAL: 50000,
    HIGH: 30000,
    MEDIUM: 20000,
  };

  bins.forEach(
    (bin, index) => {
      // ----------------------------------------------
      // IMPORTANT
      //
      // Mandatory bin:
      // DO NOT add disjunction.
      //
      // OR-Tools MUST visit it.
      // ----------------------------------------------

      if (
        bin.isOptional !== true
      ) {
        console.log(
          `MANDATORY BIN → ${bin.binId}`
        );

        return;
      }

      // ----------------------------------------------
      // Optional bin
      // OR-Tools may skip it.
      // ----------------------------------------------

      const locationIndex =
        trucks.length +
        index;

      const routingIndex =
        manager.NodeToIndex(
          locationIndex
        );

      const penalty =
        optionalPenalty[
          bin.priority
        ] || 20000;

      console.log(
        `OPTIONAL BIN → ${bin.binId} | ` +
        `LEVEL: ${bin.level ?? "N/A"}% | ` +
        `PENALTY: ${penalty}`
      );

      routing.AddDisjunction(
        [routingIndex],
        penalty
      );
    }
  );

  // --------------------------------------------------
  // SEARCH PARAMETERS
  // --------------------------------------------------

  const searchParameters =
    DefaultRoutingSearchParameters();

  searchParameters.firstSolutionStrategy =
    FirstSolutionStrategy.PATH_CHEAPEST_ARC;

  searchParameters.localSearchMetaheuristic =
    LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH;

  searchParameters.timeLimit = {
    seconds: 10,
  };

  // --------------------------------------------------
  // SOLVE
  // --------------------------------------------------

  const solution =
    await routing.SolveWithParameters(
      searchParameters
    );

  if (!solution) {
    throw new Error(
      "No feasible CVRP solution found"
    );
  }

  // --------------------------------------------------
  // EXTRACT ROUTES
  // --------------------------------------------------

  const routes = [];

  for (
    let vehicleId = 0;
    vehicleId < numVehicles;
    vehicleId++
  ) {
    let index =
      routing.Start(
        vehicleId
      );

    const route = [];

    let totalLoad = 0;

    let totalDistance = 0;

    // ------------------------------------------------
    // TRUCK DEBUG
    // ------------------------------------------------

    console.log(
      "---------------------------------------------"
    );

    console.log(
      `CVRP VEHICLE INDEX: ${vehicleId}`
    );

    console.log(
      `CVRP TRUCK ID: ${
        trucks[vehicleId].truckId
      }`
    );

    // ------------------------------------------------
    // WALK THROUGH ROUTE
    // ------------------------------------------------

    while (
      !routing.IsEnd(index)
    ) {
      const nodeIndex =
        manager.IndexToNode(
          index
        );

      const location =
        locations[nodeIndex];

      // ----------------------------------------------
      // BIN
      // ----------------------------------------------

      if (
        location.type ===
        "BIN"
      ) {
        totalLoad +=
          location.estimatedLoad;

        route.push({
          binId:
            location.binId,

          latitude:
            location.latitude,

          longitude:
            location.longitude,

          estimatedLoad:
            location.estimatedLoad,

          priority:
            location.priority,

          isOptional:
            location.isOptional,
        });

        console.log(
          `  → ${
            location.isOptional
              ? "OPTIONAL"
              : "MANDATORY"
          } BIN: ${
            location.binId
          }`
        );
      }

      const nextIndex =
        solution.Value(
          routing.NextVar(
            index
          )
        );

      totalDistance +=
        routing.GetArcCostForVehicle(
          index,
          nextIndex,
          vehicleId
        );

      index =
        nextIndex;
    }

    // ------------------------------------------------
    // ONLY SAVE TRUCKS WITH BINS
    // ------------------------------------------------

    if (
      route.length > 0
    ) {
      routes.push({
        truckId:
          trucks[vehicleId]
            .truckId,

        truckNumber:
          trucks[vehicleId]
            .truckNumber,

        capacity:
          trucks[vehicleId]
            .capacity,

        mongoTruckId:
          trucks[vehicleId]
            .mongoTruckId,

        depotId:
          trucks[vehicleId]
            .depotId,

        mongoDepotId:
          trucks[vehicleId]
            .mongoDepotId,

        depotName:
          trucks[vehicleId]
            .depotName,

        depotLatitude:
          trucks[vehicleId]
            .depotLatitude,

        depotLongitude:
          trucks[vehicleId]
            .depotLongitude,

        totalLoad:
          Number(
            totalLoad.toFixed(
              2
            )
          ),

        remainingCapacity:
          Number(
            (
              trucks[vehicleId]
                .capacity -
              totalLoad
            ).toFixed(
              2
            )
          ),

        totalDistanceMeters:
          totalDistance,

        totalDistanceKm:
          Number(
            (
              totalDistance /
              1000
            ).toFixed(
              2
            )
          ),

        bins:
          route,
      });
    }
  }

  // --------------------------------------------------
  // FINAL RESULT
  // --------------------------------------------------

  console.log(
    "================================================="
  );

  console.log(
    "CVRP FINAL RESULT"
  );

  console.log(
    `Total bins considered: ${bins.length}`
  );

  console.log(
    `Total trucks used: ${routes.length}`
  );

  routes.forEach(
    (route) => {
      console.log(
        `TRUCK ${route.truckId} → ` +
        `${route.bins.length} bins | ` +
        `${route.totalLoad} kg`
      );
    }
  );

  console.log(
    "================================================="
  );

  return {
    totalBins:
      bins.length,

    totalTrucksUsed:
      routes.length,

    routes,
  };
};

// ----------------------------------------------------
// EXPORTS
// ----------------------------------------------------

module.exports = {
  optimizeCVRP,

  haversineDistance,
};