const { getRoadRoute } = require("./services/roadRouteService");

const test = async () => {
  try {
    const route = await getRoadRoute([
      {
        name: "Coimbatore Sewage Depot",
        latitude: 10.9868865,
        longitude: 77.0023039,
      },
      {
        name: "PN Palayam Bin",
        latitude: 11.012775134360874,
        longitude: 76.9832876358316,
      },
    ]);

    console.log("\n========== ROAD ROUTE ==========\n");

    console.log("Distance:", route.distanceKm, "km");

    console.log(
      "Duration:",
      route.durationSeconds,
      "seconds"
    );

    console.log("\nROAD STEPS:\n");

    route.steps.forEach((step, index) => {
      console.log(
        `${index + 1}. ${step.maneuver || ""} ${step.modifier || ""} → ${step.roadName}`
      );
    });

    console.log("\n================================\n");

  } catch (error) {
    console.error("TEST FAILED:", error.message);
  }
};

test();