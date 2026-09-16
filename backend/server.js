const dotenv = require("dotenv");

dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const binRoutes = require("./routes/binRoutes");
const depotRoutes = require("./routes/depotRoutes");
const truckRoutes = require("./routes/truckRoutes");
const routeRoutes = require("./routes/routeRoutes");

const CollectionRequest = require("./models/CollectionRequest");
const { runRouteOptimization } = require("./controllers/routeController");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Smart Waste Management API Running");
});

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/routes", routeRoutes);

app.post("/test-body", (req, res) => {
  console.log("TEST BODY:", req.body);

  res.json({
    received: req.body,
  });
});

app.use("/api/bins", binRoutes);
app.use("/api/depots", depotRoutes);

// ============================================================
// AUTOMATIC PENDING REQUEST CHECKER
// ============================================================

const checkPendingRequests = async () => {
  try {
    const pendingCount = await CollectionRequest.countDocuments({
      status: {
        $in: [
          "NOT_ASSIGNED",
          "PENDING",
        ],
      },
    });

    if (pendingCount === 0) {
      return;
    }

    console.log(
      `AUTO CHECK: ${pendingCount} pending collection request(s) found`
    );

    console.log(
      "AUTO CHECK: Starting automatic route optimization..."
    );

    const result = await runRouteOptimization();

    console.log(
      "AUTO CHECK: Optimization result:",
      result.message
    );
  } catch (error) {
    console.error(
      "AUTO CHECK: Route optimization failed:",
      error.message
    );
  }
};

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(5000, "0.0.0.0", () => {
      console.log("Server running on port 5000");

      // Check immediately after server starts
      checkPendingRequests();

      // Check every 10 seconds
      setInterval(checkPendingRequests, 10000);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error);
  });