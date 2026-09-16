import "../styles/VirtualBin.css";


// =====================================================
// GET BIN STATUS
// =====================================================

const getStatus = (level) => {

  if (level <= 30) {
    return "Underfilled";
  }

  if (level <= 60) {
    return "Normal";
  }

  if (level <= 80) {
    return "Nearly Full";
  }

  return "Overfilled";
};


// =====================================================
// VIRTUAL BIN COMPONENT
// =====================================================

const VirtualBin = ({ bin }) => {

  /*
    Convert backend level into number.

    Supports:
    level
    wasteLevel
    fillLevel

    So even if your backend uses one of these names,
    the visualization can still work.
  */

  const rawLevel =
    bin.level ??
    bin.wasteLevel ??
    bin.fillLevel ??
    0;


  const level = Math.min(
    100,
    Math.max(0, Number(rawLevel) || 0)
  );


  const status = getStatus(level);


  return (

    <div className="virtual-bin-card">


      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="virtual-bin-header">

        <div className="virtual-bin-title">

          <span className="virtual-bin-label">
            WASTE BIN
          </span>

          <h3>
            {bin.binId || "Unknown Bin"}
          </h3>

        </div>


        <span
          className={`virtual-bin-status ${status
            .toLowerCase()
            .replace(/\s+/g, "-")}`}
        >
          {status}
        </span>

      </div>



      {/* ================================================= */}
      {/* BIN VISUALIZATION */}
      {/* ================================================= */}

      <div className="virtual-bin-scene">


        {/* ================= LID ================= */}

        <div className="real-bin-lid">

          <div className="lid-handle"></div>

        </div>



        {/* ================= BIN BODY ================= */}

        <div className="real-bin-body">


          {/* ================================================= */}
          {/* WASTE */}
          {/* ================================================= */}

          <div
            className="real-waste"
            style={{
              height: `${level}%`
            }}
          >

            {/* WASTE SURFACE */}

            <div className="waste-surface"></div>


            {/* PAPER */}

            <div className="trash-paper paper-one"></div>

            <div className="trash-paper paper-two"></div>


            {/* BOTTLE */}

            <div className="trash-bottle bottle-one">

              <div className="bottle-cap"></div>

            </div>


            {/* CAN */}

            <div className="trash-can can-one"></div>


            {/* FOOD */}

            <div className="trash-food food-one"></div>

            <div className="trash-food food-two"></div>


            {/* BAG */}

            <div className="trash-bag bag-one"></div>


            {/* VEGETABLE */}

            <div className="trash-vegetable vegetable-one"></div>

            <div className="trash-vegetable vegetable-two"></div>


            {/* SMALL TRASH */}

            <div className="trash-small small-one"></div>

            <div className="trash-small small-two"></div>

          </div>



          {/* ================================================= */}
          {/* TRANSPARENT GLASS */}
          {/* ================================================= */}

          <div className="bin-glass"></div>

          <div className="bin-shine"></div>


        </div>



        {/* ================================================= */}
        {/* WHEELS */}
        {/* ================================================= */}

        <div className="real-bin-wheels">

          <div></div>

          <div></div>

        </div>


      </div>



      {/* ================================================= */}
      {/* WASTE LEVEL */}
      {/* ================================================= */}

      <div className="virtual-bin-level">

        <div className="level-heading">

          <span>
            WASTE LEVEL
          </span>

          <strong>
            {level.toFixed(1)}%
          </strong>

        </div>


        <div className="level-track">

          <div
            className="level-fill"
            style={{
              width: `${level}%`
            }}
          ></div>

        </div>

      </div>



      {/* ================================================= */}
      {/* DETAILS */}
      {/* ================================================= */}

      <div className="virtual-bin-details">


        {/* AREA */}

        <div className="bin-detail-item">

          <span>
            AREA
          </span>

          <strong>
            {bin.area || "Not available"}
          </strong>

        </div>


        {/* CITY */}

        <div className="bin-detail-item">

          <span>
            CITY
          </span>

          <strong>
            {bin.city || "Not available"}
          </strong>

        </div>


      </div>


    </div>

  );

};


export default VirtualBin;