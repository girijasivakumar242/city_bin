const { SerialPort } = require("serialport");
const axios = require("axios");


// ============================================================
// SERIAL PORT CONFIGURATION
// ============================================================

const port = new SerialPort({
    path: "COM9",
    baudRate: 9600
});

let buffer = "";


// ============================================================
// BIN CONTROL
// ============================================================

// Current bin position
let binIndex = 0;


// Last sensor value that successfully updated a bin
let lastProcessedLevel = null;


// ============================================================
// TUNING SETTINGS
// ============================================================

// The potentiometer must move by more than this value
// before it is considered a NEW tuning.
const NEW_TUNING_THRESHOLD = 3.0;


// Number of similar readings required before a tuning
// is considered stable.
const REQUIRED_STABLE_READINGS = 3;


// Maximum allowed difference between stable readings
const STABILITY_TOLERANCE = 1.0;


// ============================================================
// STABILITY CONTROL
// ============================================================

let candidateLevel = null;
let stableCount = 0;


// ============================================================
// TUNING LOCK
// ============================================================

// After one bin is updated, the current potentiometer
// position is locked. Similar readings are ignored until
// the potentiometer moves significantly.
let waitingForNewTuning = false;


// ============================================================
// DATABASE UPDATE LOCK
// ============================================================

let isProcessing = false;


// ============================================================
// SERIAL PORT OPEN
// ============================================================

port.on("open", () => {

    console.log("Connected to COM9");

});


// ============================================================
// SERIAL DATA
// ============================================================

port.on("data", async (data) => {

    // Add incoming data to buffer
    buffer += data.toString();


    // Split complete messages
    const lines = buffer.split("\n");


    // Keep incomplete message for next data event
    buffer = lines.pop();


    // Process every complete line
    for (const line of lines) {

        const cleanLine = line.trim();


        if (!cleanLine) {
            continue;
        }


        console.log("Received:", cleanLine);


        // ====================================================
        // EXTRACT WASTE LEVEL
        // ====================================================

        const match = cleanLine.match(
            /Waste Level:\s*([\d.]+)%/
        );


        if (!match) {

            console.log(
                "Invalid waste level:",
                cleanLine
            );

            continue;
        }


        const level = Number(match[1]);


        console.log(
            "Parsed Level:",
            level
        );


        // ====================================================
        // FIRST TUNING
        // ====================================================

        if (lastProcessedLevel === null) {


            // Start collecting readings
            if (candidateLevel === null) {

                candidateLevel = level;
                stableCount = 1;

            } else {

                const difference =
                    Math.abs(
                        level - candidateLevel
                    );


                // Reading is similar to previous candidate
                if (
                    difference <=
                    STABILITY_TOLERANCE
                ) {

                    stableCount++;

                } else {

                    // Potentiometer is still moving
                    candidateLevel = level;
                    stableCount = 1;
                }
            }


            console.log(
                `First tuning stability: ${stableCount}/${REQUIRED_STABLE_READINGS}`
            );


            // Wait until stable
            if (
                stableCount <
                REQUIRED_STABLE_READINGS
            ) {

                continue;
            }


            // ====================================================
            // FIRST TUNING CONFIRMED
            // ====================================================

            console.log(
                `FIRST TUNING CONFIRMED: ${candidateLevel}%`
            );


            // Update ONLY first bin
            await updateBin(
                candidateLevel
            );


            continue;
        }


        // ====================================================
        // WAITING FOR A NEW POTENTIOMETER POSITION
        // ====================================================

        if (waitingForNewTuning) {


            const differenceFromLast =
                Math.abs(
                    level - lastProcessedLevel
                );


            // ------------------------------------------------
            // SAME POTENTIOMETER POSITION
            // ------------------------------------------------

            if (
                differenceFromLast <
                NEW_TUNING_THRESHOLD
            ) {

                console.log(
                    `Same tuning (${level}%). Ignoring.`
                );

                continue;
            }


            // ------------------------------------------------
            // NEW POTENTIOMETER POSITION DETECTED
            // ------------------------------------------------

            console.log(
                `NEW position detected: ${lastProcessedLevel}% → ${level}%`
            );


            // Unlock and begin checking stability
            waitingForNewTuning = false;


            candidateLevel = level;
            stableCount = 1;


            continue;
        }


        // ====================================================
        // CHECK STABILITY OF NEW POSITION
        // ====================================================

        const differenceFromCandidate =
            Math.abs(
                level - candidateLevel
            );


        // Reading is stable
        if (
            differenceFromCandidate <=
            STABILITY_TOLERANCE
        ) {

            stableCount++;

        } else {

            // Potentiometer is still moving
            candidateLevel = level;
            stableCount = 1;
        }


        console.log(
            `New tuning stability: ${stableCount}/${REQUIRED_STABLE_READINGS}`
        );


        // ====================================================
        // WAIT UNTIL NEW POSITION IS STABLE
        // ====================================================

        if (
            stableCount <
            REQUIRED_STABLE_READINGS
        ) {

            continue;
        }


        // ====================================================
        // NEW TUNING CONFIRMED
        // ====================================================

        console.log(
            `NEW TUNING CONFIRMED: ${candidateLevel}%`
        );


        // Update ONLY one bin
        await updateBin(
            candidateLevel
        );
    }
});


// ============================================================
// UPDATE CURRENT BIN
// ============================================================

async function updateBin(level) {


    // Prevent simultaneous database updates
    if (isProcessing) {

        console.log(
            "Previous bin update is still processing."
        );

        return;
    }


    isProcessing = true;


    try {


        // ====================================================
        // GET CURRENT BINS DYNAMICALLY
        // ====================================================

        const response = await axios.get(
            "http://localhost:5000/api/bins/all"
        );


        const bins =
            response.data.bins || [];


        // No bins available
        if (bins.length === 0) {

            console.log(
                "No bins available."
            );

            return;
        }


        // ====================================================
        // HANDLE DYNAMIC BIN COUNT
        // ====================================================

        if (
            binIndex >= bins.length
        ) {

            binIndex = 0;
        }


        // ====================================================
        // SELECT CURRENT BIN ONLY
        // ====================================================

        const currentBin =
            bins[binIndex];


        console.log(
            "\n========================================"
        );

        console.log(
            `Updating ONLY: ${currentBin.binId}`
        );

        console.log(
            `Waste Level: ${level}%`
        );


        // ====================================================
        // UPDATE DATABASE
        // ====================================================

        await axios.post(
            "http://localhost:5000/api/bins/update-level",
            {
                binId: currentBin.binId,
                level: level
            }
        );


        console.log(
            `Updated ${currentBin.binId} → ${level}%`
        );


        // ====================================================
        // REMEMBER SUCCESSFUL VALUE
        // ====================================================

        lastProcessedLevel = level;


        // Reset stability detector
        candidateLevel = null;
        stableCount = 0;


        // ====================================================
        // LOCK CURRENT TUNING
        // ====================================================

        // Adjacent sensor values from the same tuning
        // cannot update another bin.
        waitingForNewTuning = true;


        // ====================================================
        // MOVE TO NEXT BIN
        // ====================================================

        binIndex =
            (binIndex + 1) % bins.length;


        console.log(
            `Next NEW tuning will update bin index: ${binIndex}`
        );

        console.log(
            "========================================\n"
        );


    } catch (error) {


        console.error(
            "Failed to update bin:",
            error.response?.data ||
            error.message
        );


    } finally {


        isProcessing = false;
    }
}


// ============================================================
// SERIAL ERROR
// ============================================================

port.on("error", (err) => {

    console.log(
        "Serial Port Error:",
        err.message
    );

});