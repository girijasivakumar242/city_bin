import React, {
    useEffect,
    useState
} from "react";

import axios from "axios";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "../styles/TruckDashboard.css";


const TruckDashboard = () => {

    const [truck, setTruck] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [profileOpen, setProfileOpen] =
        useState(false);

    const [phone, setPhone] =
        useState("");

    const [available, setAvailable] =
        useState(true);

    const [updatingStatus, setUpdatingStatus] =
        useState(false);

    const [savingPhone, setSavingPhone] =
        useState(false);


    /* =====================================================
       ROUTE STATES
    ===================================================== */

    const [routes, setRoutes] =
        useState([]);

    const [routeLoading, setRouteLoading] =
        useState(false);

    const [collectingBin, setCollectingBin] =
        useState(null);

    /*
     * Stores the original total number of bins
     * for each route.
     *
     * Example:
     * ROUTE-123 -> 5
     */
    const [totalBinCounts, setTotalBinCounts] =
        useState({});


    // =====================================================
    // FETCH MY TRUCK
    // =====================================================

    useEffect(() => {

        const fetchMyTruck = async () => {

            try {

                const token =
                    localStorage.getItem("token");

                if (!token) {

                    window.location.href =
                        "/login";

                    return;
                }


                const response =
                    await axios.get(
                        "http://localhost:5000/api/trucks/my-truck",
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        }
                    );


                console.log(
                    "MY TRUCK RESPONSE:",
                    response.data
                );


                const fetchedTruck =
                    response.data.truck;


                setTruck(
                    fetchedTruck
                );


                setPhone(
                    fetchedTruck.userId?.phone || ""
                );


                setAvailable(
                    fetchedTruck.status ===
                    "AVAILABLE"
                );


            } catch (error) {

                console.error(
                    "FETCH TRUCK ERROR:",
                    error
                );


                if (
                    error.response?.status === 401
                ) {

                    localStorage.clear();

                    window.location.href =
                        "/login";
                }

            } finally {

                setLoading(false);
            }
        };


        fetchMyTruck();

    }, []);


    // =====================================================
    // FETCH SAVED ROUTES
    // =====================================================

    useEffect(() => {

        if (!truck) {
            return;
        }

        fetchMyRoutes();

    }, [truck]);


    const fetchMyRoutes = async () => {

        try {

            setRouteLoading(true);


            const response =
                await axios.get(
                    "http://localhost:5000/api/routes/saved"
                );


            console.log(
                "ALL SAVED ROUTES:",
                response.data
            );


            const allRoutes =
                response.data.routes ||
                response.data.savedRoutes ||
                response.data ||
                [];


            if (!Array.isArray(allRoutes)) {

                setRoutes([]);

                return;
            }


            const myTruckId =
                truck._id ||
                truck.id;


            const myTruckRoutes =
                allRoutes.filter((route) => {

                    if (!route.truckId) {
                        return false;
                    }


                    if (
                        typeof route.truckId ===
                        "object"
                    ) {

                        return (
                            String(
                                route.truckId._id
                            ) ===
                            String(myTruckId)
                        );
                    }


                    return (
                        String(
                            route.truckId
                        ) ===
                        String(myTruckId)
                    );

                });


            console.log(
                "MY ASSIGNED ROUTES:",
                myTruckRoutes
            );


            /*
             * Store the ORIGINAL number of bins.
             *
             * Then hide bins which are already collected.
             */

            const activeRoutes =
                myTruckRoutes.filter(
                    (route) =>
                        route.status !== "COMPLETED" &&
                        route.status !== "CANCELLED"
                );

            const preparedRoutes =
                activeRoutes.map(
                    (route) => {

                        const originalBins =
                            route.bins || [];


                        const totalBins =
                            originalBins.length;


                        return {
                            ...route,

                            totalBins,

                            bins:
                                originalBins.filter(
                                    (bin) =>
                                        bin.collectionStatus !==
                                        "COLLECTED"
                                ),
                        };
                    }
                );


            /*
             * Store total bin count
             * separately.
             */

            const counts = {};


            preparedRoutes.forEach(
                (route) => {

                    counts[route.routeId] =
                        route.totalBins || 0;

                }
            );


            setTotalBinCounts(
                counts
            );


            setRoutes(
                preparedRoutes
            );


        } catch (error) {

            console.error(
                "FETCH ROUTES ERROR:",
                error
            );

            setRoutes([]);

        } finally {

            setRouteLoading(false);
        }
    };


    // =====================================================
    // COLLECT BIN
    // =====================================================

    const handleCollectBin = async (
        routeId,
        binId
    ) => {

        try {

            setCollectingBin(
                String(binId)
            );


            const token =
                localStorage.getItem("token");


            if (!token) {

                window.location.href =
                    "/login";

                return;
            }


            const response =
                await axios.post(
                    `http://localhost:5000/api/routes/${routeId}/bins/${binId}/collect`,
                    {},
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );


            console.log(
                "COLLECT BIN RESPONSE:",
                response.data
            );


            /*
             * If this was the LAST bin, the backend has already
             * completed the route and released the truck.
             * Remove the entire route immediately so the map,
             * blue OSRM line and collection order disappear.
             */

            if (response.data.allBinsCollected === true) {

                setRoutes(
                    (prevRoutes) =>
                        prevRoutes.filter(
                            (route) =>
                                String(route.routeId) !==
                                String(routeId)
                        )
                );

                // Assignment is system-controlled.
                // Driver availability is left unchanged.
                setTruck(
                    (previousTruck) => {
                        if (!previousTruck) {
                            return previousTruck;
                        }

                        return {
                            ...previousTruck,
                            assignmentStatus: "NOT_ASSIGNED",
                        };
                    }
                );

                console.log(
                    "ALL BINS COLLECTED - ROUTE COMPLETED - TRUCK NOT_ASSIGNED"
                );

                return;
            }

            // Some bins are still pending, so remove only the
            // bin that was just collected.
            setRoutes(
                (prevRoutes) =>
                    prevRoutes.map(
                        (route) => {

                            if (
                                String(route.routeId) !==
                                String(routeId)
                            ) {
                                return route;
                            }

                            return {
                                ...route,

                                bins:
                                    (route.bins || [])
                                        .filter(
                                            (bin) => {

                                                const currentBinId =
                                                    bin.binId?._id ||
                                                    bin.binId;

                                                return (
                                                    String(currentBinId) !==
                                                    String(binId)
                                                );
                                            }
                                        ),
                            };
                        }
                    )
            );



        } catch (error) {

            console.error(
                "COLLECT BIN ERROR:",
                error
            );


            alert(
                error.response?.data?.message ||
                "Failed to collect bin"
            );

        } finally {

            setCollectingBin(
                null
            );
        }
    };


    // =====================================================
    // CONVERT OSRM COORDINATES
    // =====================================================

    const getRouteCoordinates = (
        route
    ) => {

        const coordinates =
            route?.roadGeometry?.coordinates;


        if (
            !Array.isArray(coordinates) ||
            coordinates.length === 0
        ) {

            return [];
        }


        return coordinates
            .filter(
                (coordinate) =>
                    Array.isArray(coordinate) &&
                    coordinate.length >= 2
            )
            .map(
                (coordinate) => [
                    Number(coordinate[1]),
                    Number(coordinate[0]),
                ]
            );
    };


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (

            <div className="truck-dashboard-loading">

                <div className="loading-spinner"></div>

                <p>
                    Loading your dashboard...
                </p>

            </div>
        );
    }


    // =====================================================
    // NO TRUCK
    // =====================================================

    if (!truck) {

        return (

            <div className="truck-dashboard-loading">

                <div className="empty-route-icon">
                    🚛
                </div>

                <h2>
                    Truck Information Not Found
                </h2>

                <p>
                    Please complete your truck registration.
                </p>

            </div>
        );
    }


    // =====================================================
    // DRIVER NAME
    // =====================================================

    const driverName =
        truck.userId?.name ||
        truck.driverName ||
        "Driver";


    // =====================================================
    // DEPOT NAME
    // =====================================================

    const depotName =
        truck.depotId?.name ||
        truck.depotId?.depotId ||
        "Depot";


    // =====================================================
    // DEPOT LOCATION
    // =====================================================

    const depotLatitude =
        Number(
            truck.depotId?.latitude
        );


    const depotLongitude =
        Number(
            truck.depotId?.longitude
        );


    // =====================================================
    // UPDATE AVAILABILITY
    // =====================================================

    const handleAvailability = async () => {

        try {

            if (updatingStatus) {
                return;
            }


            const token =
                localStorage.getItem("token");


            if (!token) {

                window.location.href =
                    "/login";

                return;
            }


            const newStatus =
                available
                    ? "UNAVAILABLE"
                    : "AVAILABLE";


            setUpdatingStatus(true);


            const response =
                await axios.put(
                    "http://localhost:5000/api/trucks/status",
                    {
                        status:
                            newStatus,
                    },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );


            setAvailable(
                newStatus ===
                "AVAILABLE"
            );


            if (
                response.data.truck
            ) {

                setTruck(
                    response.data.truck
                );
            }


        } catch (error) {

            console.error(
                "UPDATE AVAILABILITY ERROR:",
                error
            );


            alert(
                error.response?.data?.message ||
                "Failed to update availability"
            );


        } finally {

            setUpdatingStatus(false);
        }
    };


    // =====================================================
    // SAVE PHONE NUMBER
    // =====================================================

    const handlePhoneSave = async () => {

        try {

            const token =
                localStorage.getItem("token");


            if (!token) {

                window.location.href =
                    "/login";

                return;
            }


            if (!phone.trim()) {

                alert(
                    "Please enter a phone number"
                );

                return;
            }


            setSavingPhone(true);


            const response =
                await axios.put(
                    "http://localhost:5000/api/trucks/phone",
                    {
                        phone:
                            phone.trim(),
                    },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );


            setTruck(
                (previousTruck) => ({

                    ...previousTruck,

                    userId: {

                        ...previousTruck.userId,

                        phone:
                            response.data.phone,
                    },

                })
            );


            alert(
                "Phone number saved successfully!"
            );


        } catch (error) {

            console.error(
                "PHONE UPDATE ERROR:",
                error
            );


            alert(
                error.response?.data?.message ||
                "Failed to save phone number"
            );


        } finally {

            setSavingPhone(false);
        }
    };


    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {

        localStorage.clear();

        window.location.href =
            "/login";
    };


    // =====================================================
    // UI
    // =====================================================

    return (

        <div className="truck-dashboard">


            {/* =================================================
                HEADER
            ================================================= */}

            <header className="truck-header">

                <div className="truck-brand">

                    <div className="truck-logo">
                        🚛
                    </div>

                    <div>

                        <h1>
                            CITY BIN
                        </h1>

                        <span>
                            SMART WASTE MANAGEMENT
                        </span>

                    </div>

                </div>


                <div className="truck-header-right">

                    <div className="driver-welcome">

                        <span>
                            Welcome
                        </span>

                        <strong>
                            {driverName}
                        </strong>

                    </div>


                    <div className="profile-wrapper">

                        <button
                            className="profile-button"
                            onClick={() =>
                                setProfileOpen(
                                    !profileOpen
                                )
                            }
                        >
                            👤
                        </button>


                        {profileOpen && (

                            <div className="profile-dropdown">

                                <div className="profile-top">

                                    <div className="profile-avatar">
                                        👤
                                    </div>

                                    <div>

                                        <h3>
                                            {driverName}
                                        </h3>

                                        <span>
                                            Truck Driver
                                        </span>

                                    </div>

                                </div>


                                <div className="profile-divider"></div>


                                <div className="profile-field">

                                    <label>
                                        DRIVER NAME
                                    </label>

                                    <div className="profile-value">
                                        {driverName}
                                    </div>

                                </div>


                                <div className="profile-field">

                                    <label>
                                        EMAIL
                                    </label>

                                    <div className="profile-value">
                                        {truck.userId?.email ||
                                            "Not available"}
                                    </div>

                                </div>


                                <div className="profile-field">

                                    <label>
                                        PHONE NUMBER
                                    </label>

                                    <input
                                        type="tel"
                                        placeholder="Enter phone number"
                                        value={phone}
                                        onChange={(e) =>
                                            setPhone(
                                                e.target.value
                                            )
                                        }
                                    />

                                </div>


                                <button
                                    className="save-phone"
                                    onClick={
                                        handlePhoneSave
                                    }
                                    disabled={
                                        savingPhone
                                    }
                                >

                                    {savingPhone
                                        ? "Saving..."
                                        : "Save Phone Number"}

                                </button>


                                <button
                                    className="logout-button"
                                    onClick={
                                        handleLogout
                                    }
                                >
                                    ↪ Logout
                                </button>

                            </div>
                        )}

                    </div>

                </div>

            </header>


            {/* =================================================
                MAIN
            ================================================= */}

            <main className="truck-main">


                {/* INTRO */}

                <section className="truck-intro">

                    <div className="truck-badge">
                        DRIVER DASHBOARD
                    </div>

                    <h2>
                        Welcome back, {driverName} 👋
                    </h2>

                    <p>
                        Manage your truck availability
                        and view your assigned collection routes.
                    </p>

                </section>


                {/* =================================================
                    AVAILABILITY
                ================================================= */}

                <section className="availability-card">

                    <div className="availability-left">

                        <div className="availability-icon">

                            {available
                                ? "✓"
                                : "−"}

                        </div>


                        <div>

                            <span className="section-label">
                                DRIVER STATUS
                            </span>

                            <h3>

                                {available
                                    ? "You are Available"
                                    : "You are Unavailable"}

                            </h3>

                            <p>

                                {available
                                    ? "You can be assigned for waste collection routes."
                                    : "You will not be considered for new route assignments."}

                            </p>

                        </div>

                    </div>


                    <button
                        className={`availability-toggle ${
                            available
                                ? "active"
                                : ""
                        }`}
                        onClick={
                            handleAvailability
                        }
                        disabled={
                            updatingStatus
                        }
                    >

                        <span className="toggle-circle"></span>

                        {updatingStatus
                            ? "Updating..."
                            : available
                                ? "Available"
                                : "Unavailable"}

                    </button>

                </section>


                {/* =================================================
                    TRUCK STATS
                ================================================= */}

                <section className="truck-stats">


                    <div className="stat-card">

                        <div className="stat-icon">
                            🚛
                        </div>

                        <div>

                            <span>
                                TRUCK ID
                            </span>

                            <strong>
                                {truck.truckId}
                            </strong>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            🔢
                        </div>

                        <div>

                            <span>
                                TRUCK NUMBER
                            </span>

                            <strong>
                                {truck.truckNumber}
                            </strong>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            📦
                        </div>

                        <div>

                            <span>
                                CAPACITY
                            </span>

                            <strong>
                                {truck.capacity} kg
                            </strong>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            📍
                        </div>

                        <div>

                            <span>
                                DEPOT
                            </span>

                            <strong>
                                {depotName}
                            </strong>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    ASSIGNED ROUTES
                ================================================= */}

                <section className="routes-section">


                    <div className="section-heading">

                        <div>

                            <div className="small-badge">
                                COLLECTION ROUTES
                            </div>

                            <h2>
                                Assigned Routes
                            </h2>

                            <p>
                                Your optimized waste collection
                                route is shown below.
                            </p>

                        </div>


                        <div className="route-count">

                            {routes.length}{" "}

                            {routes.length === 1
                                ? "Route"
                                : "Routes"}

                        </div>

                    </div>


                    {/* ROUTE LOADING */}

                    {routeLoading && (

                        <div className="empty-routes">

                            <div className="empty-route-icon">
                                🔄
                            </div>

                            <h3>
                                Loading Route...
                            </h3>

                            <p>
                                Fetching your assigned
                                collection route.
                            </p>

                        </div>
                    )}


                    {/* NO ROUTES */}

                    {!routeLoading &&
                        routes.length === 0 && (

                            <div className="empty-routes">

                                <div className="empty-route-icon">
                                    🗺️
                                </div>

                                <h3>
                                    No Routes Assigned
                                </h3>

                                <p>
                                    You currently don't have any
                                    active collection routes assigned.
                                </p>

                                <span>

                                    Keep your status{" "}

                                    <strong>
                                        Available
                                    </strong>

                                    {" "}when you are ready for a route.

                                </span>

                            </div>
                        )}


                    {/* =================================================
                        ROUTES
                    ================================================= */}

                    {!routeLoading &&

                        routes.map(
                            (route, routeIndex) => {

                                const coordinates =
                                    getRouteCoordinates(
                                        route
                                    );


                                const routeLocations =
                                    route.routeLocations ||
                                    [];


                                const routeBins =
                                    route.bins || [];


                                /*
                                 * Original total number
                                 * of bins in this route.
                                 */

                                const totalBins =
                                    totalBinCounts[
                                        route.routeId
                                    ] ??
                                    route.totalBins ??
                                    routeBins.length;


                                /*
                                 * Since collected bins are
                                 * removed from routeBins,
                                 * remaining bins tell us
                                 * how many are left.
                                 */

                                const collectedCount =
                                    Math.max(
                                        0,
                                        totalBins -
                                        routeBins.length
                                    );


                                const allBinsCollected =
                                    totalBins > 0 &&
                                    collectedCount ===
                                    totalBins;


                                return (

                                    <div
                                        className="driver-route-card"
                                        key={
                                            route._id ||
                                            route.routeId ||
                                            routeIndex
                                        }
                                    >


                                        {/* =================================
                                            ROUTE HEADER
                                        ================================= */}

                                        <div
                                            style={{
                                                display:
                                                    "flex",
                                                justifyContent:
                                                    "space-between",
                                                alignItems:
                                                    "center",
                                                marginBottom:
                                                    "15px",
                                            }}
                                        >

                                            <div>

                                                <span
                                                    className="section-label"
                                                >
                                                    OPTIMIZED ROUTE
                                                </span>

                                                <h3
                                                    style={{
                                                        margin:
                                                            "5px 0",
                                                    }}
                                                >
                                                    🚛{" "}
                                                    {route.routeId ||
                                                        `Route ${
                                                            routeIndex +
                                                            1
                                                        }`}
                                                </h3>

                                            </div>


                                            <div
                                                style={{
                                                    background:
                                                        route.status ===
                                                        "COMPLETED"
                                                            ? "#dcfce7"
                                                            : "#dbeafe",

                                                    color:
                                                        route.status ===
                                                        "COMPLETED"
                                                            ? "#166534"
                                                            : "#1d4ed8",

                                                    padding:
                                                        "6px 12px",

                                                    borderRadius:
                                                        "20px",

                                                    fontSize:
                                                        "13px",

                                                    fontWeight:
                                                        "600",
                                                }}
                                            >

                                                {route.status ||
                                                    "ASSIGNED"}

                                            </div>

                                        </div>


                                        {/* =================================
                                            ROUTE STATS
                                        ================================= */}

                                        <div
                                            style={{
                                                display:
                                                    "grid",

                                                gridTemplateColumns:
                                                    "repeat(auto-fit, minmax(150px, 1fr))",

                                                gap:
                                                    "12px",

                                                marginBottom:
                                                    "20px",
                                            }}
                                        >

                                            <div
                                                style={{
                                                    padding:
                                                        "12px",
                                                    background:
                                                        "#f8fafc",
                                                    borderRadius:
                                                        "8px",
                                                }}
                                            >

                                                <span>
                                                    🏭 Depot
                                                </span>

                                                <strong
                                                    style={{
                                                        display:
                                                            "block",
                                                        marginTop:
                                                            "4px",
                                                    }}
                                                >

                                                    {route.depotId?.name ||
                                                        routeLocations.find(
                                                            (location) =>
                                                                location.type ===
                                                                "DEPOT"
                                                        )?.name ||
                                                        depotName}

                                                </strong>

                                            </div>


                                            <div
                                                style={{
                                                    padding:
                                                        "12px",
                                                    background:
                                                        "#f8fafc",
                                                    borderRadius:
                                                        "8px",
                                                }}
                                            >

                                                <span>
                                                    🛣️ Road Distance
                                                </span>

                                                <strong
                                                    style={{
                                                        display:
                                                            "block",
                                                        marginTop:
                                                            "4px",
                                                    }}
                                                >

                                                    {route.roadDistanceKm !=
                                                    null
                                                        ? `${route.roadDistanceKm} km`
                                                        : "Not available"}

                                                </strong>

                                            </div>


                                            <div
                                                style={{
                                                    padding:
                                                        "12px",
                                                    background:
                                                        "#f8fafc",
                                                    borderRadius:
                                                        "8px",
                                                }}
                                            >

                                                <span>
                                                    ⏱️ Estimated Time
                                                </span>

                                                <strong
                                                    style={{
                                                        display:
                                                            "block",
                                                        marginTop:
                                                            "4px",
                                                    }}
                                                >

                                                    {route.roadDurationMinutes !=
                                                    null
                                                        ? `${route.roadDurationMinutes} min`
                                                        : "Not available"}

                                                </strong>

                                            </div>


                                            <div
                                                style={{
                                                    padding:
                                                        "12px",
                                                    background:
                                                        "#f8fafc",
                                                    borderRadius:
                                                        "8px",
                                                }}
                                            >

                                                <span>
                                                    📦 Total Load
                                                </span>

                                                <strong
                                                    style={{
                                                        display:
                                                            "block",
                                                        marginTop:
                                                            "4px",
                                                    }}
                                                >

                                                    {route.totalLoad ?? 0} kg

                                                </strong>

                                            </div>

                                        </div>


                                        {/* =================================
                                            MAP
                                        ================================= */}

                                        <div
                                            style={{
                                                width:
                                                    "100%",

                                                height:
                                                    "500px",

                                                borderRadius:
                                                    "12px",

                                                overflow:
                                                    "hidden",

                                                marginBottom:
                                                    "20px",

                                                border:
                                                    "1px solid #ddd",
                                            }}
                                        >

                                            <MapContainer

                                                center={
                                                    coordinates.length >
                                                    0
                                                        ? coordinates[0]
                                                        : [
                                                              depotLatitude ||
                                                                  11.0133,
                                                              depotLongitude ||
                                                                  76.9856,
                                                          ]
                                                }

                                                zoom={14}

                                                scrollWheelZoom={true}

                                                style={{
                                                    width:
                                                        "100%",
                                                    height:
                                                        "100%",
                                                }}
                                            >

                                                <TileLayer
                                                    attribution="&copy; OpenStreetMap contributors"
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                />


                                                {/* DEPOT */}

                                                {routeLocations
                                                    .filter(
                                                        (location) =>
                                                            location.type ===
                                                            "DEPOT"
                                                    )
                                                    .map(
                                                        (
                                                            location
                                                        ) => (

                                                            <Marker
                                                                key={`depot-${routeIndex}-${location.sequence}`}
                                                                position={[
                                                                    Number(
                                                                        location.latitude
                                                                    ),
                                                                    Number(
                                                                        location.longitude
                                                                    ),
                                                                ]}
                                                            >

                                                                <Popup>

                                                                    <strong>
                                                                        🏭 Depot
                                                                    </strong>

                                                                    <br />

                                                                    {
                                                                        location.name
                                                                    }

                                                                    <br />

                                                                    Route Start

                                                                </Popup>

                                                            </Marker>
                                                        )
                                                    )}


                                                {/* BIN MARKERS */}

                                                {routeLocations
                                                    .filter(
                                                        (location) =>
                                                            location.type ===
                                                            "BIN"
                                                    )
                                                    .map(
                                                        (
                                                            location
                                                        ) => (

                                                            <Marker
                                                                key={`bin-${routeIndex}-${location.sequence}-${location.binId}`}
                                                                position={[
                                                                    Number(
                                                                        location.latitude
                                                                    ),
                                                                    Number(
                                                                        location.longitude
                                                                    ),
                                                                ]}
                                                            >

                                                                <Popup>

                                                                    <strong>
                                                                        🗑️{" "}
                                                                        {
                                                                            location.name
                                                                        }
                                                                    </strong>

                                                                    <br />

                                                                    Bin ID:{" "}
                                                                    {
                                                                        location.binId
                                                                    }

                                                                    <br />

                                                                    Priority:{" "}
                                                                    {
                                                                        location.priority ||
                                                                        "N/A"
                                                                    }

                                                                    <br />

                                                                    Stop:{" "}
                                                                    {
                                                                        location.sequence
                                                                    }

                                                                </Popup>

                                                            </Marker>

                                                        )
                                                    )}


                                                {/* OSRM ROAD ROUTE */}

                                                {coordinates.length >
                                                    1 && (

                                                    <Polyline

                                                        positions={
                                                            coordinates
                                                        }

                                                        pathOptions={{
                                                            color:
                                                                "#2563eb",

                                                            weight:
                                                                7,

                                                            opacity:
                                                                0.85,
                                                        }}

                                                    />

                                                )}

                                            </MapContainer>

                                        </div>


                                        {/* =================================
                                            ROUTE ORDER
                                        ================================= */}

                                        <div
                                            style={{
                                                marginBottom:
                                                    "20px",
                                            }}
                                        >

                                            <h3>
                                                🗺️ Collection Order
                                            </h3>


                                            <div
                                                style={{
                                                    display:
                                                        "flex",

                                                    flexWrap:
                                                        "wrap",

                                                    alignItems:
                                                        "center",

                                                    gap:
                                                        "8px",

                                                    marginTop:
                                                        "10px",
                                                }}
                                            >

                                                {routeLocations.map(
                                                    (
                                                        location,
                                                        index
                                                    ) => (

                                                        <React.Fragment
                                                            key={
                                                                `${routeIndex}-${location.sequence}`
                                                            }
                                                        >

                                                            {index >
                                                                0 && (

                                                                <span
                                                                    style={{
                                                                        fontSize:
                                                                            "20px",
                                                                    }}
                                                                >
                                                                    →
                                                                </span>

                                                            )}


                                                            <div
                                                                style={{
                                                                    padding:
                                                                        "8px 12px",

                                                                    borderRadius:
                                                                        "8px",

                                                                    background:
                                                                        location.type ===
                                                                        "DEPOT"
                                                                            ? "#dbeafe"
                                                                            : location.priority ===
                                                                                "CRITICAL"
                                                                              ? "#fee2e2"
                                                                              : "#f1f5f9",

                                                                    fontWeight:
                                                                        "600",

                                                                    fontSize:
                                                                        "13px",
                                                                }}
                                                            >

                                                                {location.type ===
                                                                "DEPOT"
                                                                    ? "🏭"
                                                                    : "🗑️"}{" "}

                                                                {
                                                                    location.name
                                                                }

                                                            </div>

                                                        </React.Fragment>
                                                    )
                                                )}

                                            </div>

                                        </div>


                                        {/* =================================
                                            BIN COLLECTION
                                        ================================= */}

                                        <div
                                            style={{
                                                marginBottom:
                                                    "20px",

                                                padding:
                                                    "18px",

                                                background:
                                                    "#f8fafc",

                                                borderRadius:
                                                    "12px",

                                                border:
                                                    "1px solid #e2e8f0",
                                            }}
                                        >

                                            <div
                                                style={{
                                                    display:
                                                        "flex",

                                                    justifyContent:
                                                        "space-between",

                                                    alignItems:
                                                        "center",

                                                    marginBottom:
                                                        "15px",
                                                }}
                                            >

                                                <div>

                                                    <h3
                                                        style={{
                                                            margin:
                                                                0,
                                                        }}
                                                    >
                                                        🗑️ Bin Collection
                                                    </h3>

                                                    <p
                                                        style={{
                                                            margin:
                                                                "5px 0 0",

                                                            color:
                                                                "#64748b",

                                                            fontSize:
                                                                "13px",
                                                        }}
                                                    >

                                                        {collectedCount} of{" "}
                                                        {totalBins}{" "}
                                                        bins collected

                                                    </p>

                                                </div>


                                                <div
                                                    style={{
                                                        padding:
                                                            "6px 12px",

                                                        borderRadius:
                                                            "20px",

                                                        background:
                                                            allBinsCollected
                                                                ? "#dcfce7"
                                                                : "#fef3c7",

                                                        color:
                                                            allBinsCollected
                                                                ? "#166534"
                                                                : "#92400e",

                                                        fontWeight:
                                                            "700",

                                                        fontSize:
                                                            "12px",
                                                    }}
                                                >

                                                    {allBinsCollected
                                                        ? "ALL COLLECTED"
                                                        : "COLLECTION IN PROGRESS"}

                                                </div>

                                            </div>


                                            {/* BIN LIST */}

                                            <div
                                                style={{
                                                    display:
                                                        "flex",

                                                    flexDirection:
                                                        "column",

                                                    gap:
                                                        "10px",
                                                }}
                                            >

                                                {routeBins
                                                    .slice()
                                                    .sort(
                                                        (a, b) =>
                                                            a.sequence -
                                                            b.sequence
                                                    )
                                                    .map(
                                                        (
                                                            routeBin
                                                        ) => {

                                                            const actualBinId =
                                                                routeBin
                                                                    .binId
                                                                    ?._id ||
                                                                routeBin.binId;


                                                            const displayBinId =
                                                                routeBin
                                                                    .binId
                                                                    ?.binId ||
                                                                routeBin.binId;


                                                            const location =
                                                                routeLocations.find(
                                                                    (
                                                                        item
                                                                    ) =>
                                                                        item.type ===
                                                                            "BIN" &&
                                                                        String(
                                                                            item.binId
                                                                        ) ===
                                                                            String(
                                                                                displayBinId
                                                                            )
                                                                );


                                                            const isCollected =
                                                                routeBin.collectionStatus ===
                                                                "COLLECTED";


                                                            return (

                                                                <div
                                                                    key={
                                                                        String(
                                                                            actualBinId
                                                                        )
                                                                    }

                                                                    style={{
                                                                        display:
                                                                            "flex",

                                                                        alignItems:
                                                                            "center",

                                                                        justifyContent:
                                                                            "space-between",

                                                                        gap:
                                                                            "15px",

                                                                        padding:
                                                                            "13px",

                                                                        background:
                                                                            isCollected
                                                                                ? "#ecfdf5"
                                                                                : "white",

                                                                        borderRadius:
                                                                            "10px",

                                                                        border:
                                                                            isCollected
                                                                                ? "1px solid #86efac"
                                                                                : "1px solid #e2e8f0",

                                                                        transition:
                                                                            "all 0.3s ease",
                                                                    }}
                                                                >

                                                                    <div
                                                                        style={{
                                                                            flex:
                                                                                1,
                                                                        }}
                                                                    >

                                                                        <strong
                                                                            style={{
                                                                                display:
                                                                                    "block",

                                                                                color:
                                                                                    isCollected
                                                                                        ? "#15803d"
                                                                                        : "#1e293b",
                                                                            }}
                                                                        >

                                                                            {isCollected
                                                                                ? "✅"
                                                                                : "🗑️"}{" "}

                                                                            {location?.name ||
                                                                                displayBinId ||
                                                                                "Assigned Bin"}

                                                                        </strong>


                                                                        <div
                                                                            style={{
                                                                                fontSize:
                                                                                    "12px",

                                                                                color:
                                                                                    "#64748b",

                                                                                marginTop:
                                                                                    "5px",
                                                                            }}
                                                                        >

                                                                            Bin ID:{" "}
                                                                            {displayBinId}

                                                                            {" • "}

                                                                            Priority:{" "}
                                                                            {routeBin.priority ||
                                                                                "N/A"}

                                                                            {" • "}

                                                                            Stop:{" "}
                                                                            {routeBin.sequence}

                                                                        </div>

                                                                    </div>


                                                                    <button

                                                                        onClick={() =>
                                                                            handleCollectBin(
                                                                                route.routeId,
                                                                                actualBinId
                                                                            )
                                                                        }

                                                                        disabled={
                                                                            isCollected ||
                                                                            collectingBin ===
                                                                                String(
                                                                                    actualBinId
                                                                                )
                                                                        }

                                                                        style={{
                                                                            minWidth:
                                                                                "125px",

                                                                            padding:
                                                                                "10px 15px",

                                                                            border:
                                                                                "none",

                                                                            borderRadius:
                                                                                "8px",

                                                                            background:
                                                                                isCollected
                                                                                    ? "#16a34a"
                                                                                    : "#2563eb",

                                                                            color:
                                                                                "white",

                                                                            fontWeight:
                                                                                "700",

                                                                            cursor:
                                                                                isCollected ||
                                                                                collectingBin ===
                                                                                    String(
                                                                                        actualBinId
                                                                                    )
                                                                                    ? "default"
                                                                                    : "pointer",

                                                                            opacity:
                                                                                collectingBin ===
                                                                                String(
                                                                                    actualBinId
                                                                                )
                                                                                    ? 0.7
                                                                                    : 1,
                                                                        }}
                                                                    >

                                                                        {collectingBin ===
                                                                        String(
                                                                            actualBinId
                                                                        )
                                                                            ? "Collecting..."
                                                                            : isCollected
                                                                              ? "✓ Collected"
                                                                              : "Collect"}

                                                                    </button>

                                                                </div>

                                                            );
                                                        }
                                                    )}

                                                {allBinsCollected && (

                                                    <div
                                                        style={{
                                                            textAlign:
                                                                "center",

                                                            padding:
                                                                "18px",

                                                            background:
                                                                "#ecfdf5",

                                                            border:
                                                                "1px solid #86efac",

                                                            borderRadius:
                                                                "10px",

                                                            color:
                                                                "#166534",

                                                            fontWeight:
                                                                "700",
                                                        }}
                                                    >

                                                        ✅ All assigned bins
                                                        have been collected.

                                                    </div>

                                                )}

                                            </div>

                                        </div>


                                        {/* =================================
                                            DRIVER DIRECTIONS
                                        ================================= */}

                                        {route.driverSteps &&
                                            route.driverSteps.length >
                                                0 && (

                                            <div
                                                style={{
                                                    background:
                                                        "#f8fafc",

                                                    borderRadius:
                                                        "12px",

                                                    padding:
                                                        "18px",
                                                }}
                                            >

                                                <h3
                                                    style={{
                                                        marginTop:
                                                            0,
                                                    }}
                                                >
                                                    🧭 Turn-by-Turn Directions
                                                </h3>


                                                <div
                                                    style={{
                                                        display:
                                                            "flex",

                                                        flexDirection:
                                                            "column",

                                                        gap:
                                                            "10px",
                                                    }}
                                                >

                                                    {route.driverSteps.map(
                                                        (
                                                            step
                                                        ) => {

                                                            const maneuver =
                                                                step.maneuver ||
                                                                "continue";


                                                            const modifier =
                                                                step.modifier ||
                                                                "";


                                                            let direction =
                                                                "Continue";


                                                            if (
                                                                maneuver ===
                                                                "turn"
                                                            ) {

                                                                if (
                                                                    modifier.includes(
                                                                        "left"
                                                                    )
                                                                ) {

                                                                    direction =
                                                                        "↰ Turn Left";

                                                                } else if (
                                                                    modifier.includes(
                                                                        "right"
                                                                    )
                                                                ) {

                                                                    direction =
                                                                        "↱ Turn Right";

                                                                } else {

                                                                    direction =
                                                                        "↪ Turn";
                                                                }

                                                            } else if (
                                                                maneuver ===
                                                                "depart"
                                                            ) {

                                                                direction =
                                                                    "🚛 Start";

                                                            } else if (
                                                                maneuver ===
                                                                "arrive"
                                                            ) {

                                                                direction =
                                                                    "📍 Arrive";

                                                            } else if (
                                                                maneuver ===
                                                                "new name"
                                                            ) {

                                                                direction =
                                                                    "➡ Continue";

                                                            } else if (
                                                                maneuver ===
                                                                "end of road"
                                                            ) {

                                                                if (
                                                                    modifier.includes(
                                                                        "left"
                                                                    )
                                                                ) {

                                                                    direction =
                                                                        "↰ Turn Left";

                                                                } else if (
                                                                    modifier.includes(
                                                                        "right"
                                                                    )
                                                                ) {

                                                                    direction =
                                                                        "↱ Turn Right";

                                                                } else {

                                                                    direction =
                                                                        "↪ End of Road";
                                                                }

                                                            } else if (
                                                                maneuver ===
                                                                "continue"
                                                            ) {

                                                                direction =
                                                                    "⬆ Continue Straight";

                                                            } else if (
                                                                maneuver ===
                                                                "roundabout"
                                                            ) {

                                                                direction =
                                                                    "🔄 Roundabout";

                                                            } else if (
                                                                maneuver ===
                                                                "uturn"
                                                            ) {

                                                                direction =
                                                                    "↩ U-Turn";
                                                            }


                                                            return (

                                                                <div
                                                                    key={
                                                                        step.sequence
                                                                    }

                                                                    style={{
                                                                        display:
                                                                            "flex",

                                                                        alignItems:
                                                                            "center",

                                                                        gap:
                                                                            "12px",

                                                                        background:
                                                                            "white",

                                                                        padding:
                                                                            "10px",

                                                                        borderRadius:
                                                                            "8px",
                                                                    }}
                                                                >

                                                                    <div
                                                                        style={{
                                                                            minWidth:
                                                                                "32px",

                                                                            height:
                                                                                "32px",

                                                                            borderRadius:
                                                                                "50%",

                                                                            background:
                                                                                "#e2e8f0",

                                                                            display:
                                                                                "flex",

                                                                            alignItems:
                                                                                "center",

                                                                            justifyContent:
                                                                                "center",

                                                                            fontWeight:
                                                                                "700",
                                                                        }}
                                                                    >

                                                                        {
                                                                            step.sequence
                                                                        }

                                                                    </div>


                                                                    <div
                                                                        style={{
                                                                            flex:
                                                                                1,
                                                                        }}
                                                                    >

                                                                        <strong>
                                                                            {
                                                                                direction
                                                                            }
                                                                        </strong>


                                                                        <div
                                                                            style={{
                                                                                fontSize:
                                                                                    "13px",

                                                                                color:
                                                                                    "#64748b",

                                                                                marginTop:
                                                                                    "3px",
                                                                            }}
                                                                        >

                                                                            {
                                                                                step.roadName ||
                                                                                "Unnamed Road"
                                                                            }

                                                                            {" • "}

                                                                            {step.distanceMeters !=
                                                                            null
                                                                                ? `${Math.round(
                                                                                      step.distanceMeters
                                                                                  )} m`
                                                                                : "Distance unavailable"}

                                                                        </div>

                                                                    </div>

                                                                </div>

                                                            );
                                                        }
                                                    )}

                                                </div>

                                            </div>
                                        )}

                                    </div>
                                );
                            }
                        )}

                </section>


                {/* =================================================
                    MY TRUCK
                ================================================= */}

                <section className="truck-details-card">

                    <div className="section-heading">

                        <div>

                            <div className="small-badge">
                                VEHICLE INFORMATION
                            </div>

                            <h2>
                                My Truck
                            </h2>

                        </div>

                    </div>


                    <div className="details-grid">


                        <div className="detail-item">

                            <span>
                                Driver Name
                            </span>

                            <strong>
                                {driverName}
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Truck ID
                            </span>

                            <strong>
                                {truck.truckId}
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Truck Number
                            </span>

                            <strong>
                                {truck.truckNumber}
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Capacity
                            </span>

                            <strong>
                                {truck.capacity} kg
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Assigned Depot
                            </span>

                            <strong>
                                {depotName}
                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Availability
                            </span>

                            <strong
                                className={
                                    available
                                        ? "available-text"
                                        : "unavailable-text"
                                }
                            >

                                ●{" "}

                                {available
                                    ? "Available"
                                    : "Unavailable"}

                            </strong>

                        </div>


                        <div className="detail-item">

                            <span>
                                Assignment Status
                            </span>

                            <strong
                                style={{
                                    color:
                                        truck.assignmentStatus ===
                                        "ASSIGNED"
                                            ? "#d97706"
                                            : "#16a34a",
                                }}
                            >

                                ●{" "}

                                {truck.assignmentStatus ||
                                    "NOT_ASSIGNED"}

                            </strong>

                        </div>


                    </div>

                </section>


            </main>

        </div>
    );
};


export default TruckDashboard;