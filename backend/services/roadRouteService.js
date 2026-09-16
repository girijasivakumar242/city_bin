const getRoadRoute = async (locations) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    if (!locations || locations.length < 2) {
      throw new Error("At least 2 locations are required");
    }

    // OSRM expects: longitude,latitude
    const coordinates = locations
      .map((location) => `${location.longitude},${location.latitude}`)
      .join(";");

    const url =
      `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
      `?steps=true&geometries=geojson&overview=full`;

    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OSRM request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes?.length) {
      throw new Error("No road route found");
    }

    const route = data.routes[0];

    const steps = [];

    route.legs.forEach((leg) => {
      leg.steps.forEach((step) => {
        steps.push({
          roadName: step.name || "Unnamed Road",
          distanceMeters: step.distance,
          durationSeconds: step.duration,
          maneuver: step.maneuver?.type || null,
          modifier: step.maneuver?.modifier || null,
          location: step.maneuver?.location || null,
        });
      });
    });

    return {
      distanceMeters: route.distance,
      distanceKm: Number((route.distance / 1000).toFixed(2)),
      durationSeconds: route.duration,

      geometry: route.geometry,

      steps,
    };
  } catch (error) {
    console.error("ROAD ROUTE ERROR:", error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  getRoadRoute,
};