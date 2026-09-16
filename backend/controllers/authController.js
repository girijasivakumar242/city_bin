const User = require("../models/User");
const Truck = require("../models/Truck");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// =====================================================
// SIGNUP
// =====================================================

const register = async (req, res) => {

  try {

    const {
      email,
      password,
      confirmPassword,
      role,
    } = req.body;


    // ---------------------------------------------
    // CHECK REQUIRED FIELDS
    // ---------------------------------------------

    if (
      !email ||
      !password ||
      !confirmPassword ||
      !role
    ) {

      return res.status(400).json({

        message:
          "All fields are required",

      });

    }


    // ---------------------------------------------
    // ONLY CUSTOMER AND TRUCK CAN SIGNUP
    // ---------------------------------------------

    if (
      role !== "customer" &&
      role !== "truck"
    ) {

      return res.status(400).json({

        message:
          "Invalid role",

      });

    }


    // ---------------------------------------------
    // CHECK PASSWORD
    // ---------------------------------------------

    if (
      password !== confirmPassword
    ) {

      return res.status(400).json({

        message:
          "Passwords do not match",

      });

    }


    // ---------------------------------------------
    // CHECK EXISTING USER
    // ---------------------------------------------

    const existingUser =
      await User.findOne({

        email:
          email.toLowerCase(),

      });


    if (existingUser) {

      return res.status(400).json({

        message:
          "User already exists",

      });

    }


    // ---------------------------------------------
    // HASH PASSWORD
    // ---------------------------------------------

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );


    // ---------------------------------------------
    // CREATE USER
    // ---------------------------------------------

    const user =
      await User.create({

        email:
          email.toLowerCase(),

        password:
          hashedPassword,

        role,

        truckId:
          null,

        depotId:
          null,

        truckRegistered:
          false,

      });


    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return res.status(201).json({

      message:
        "Signup successful",

      user: {

        id:
          user._id,

        email:
          user.email,

        role:
          user.role,

        truckId:
          user.truckId,

        depotId:
          user.depotId,

        truckRegistered:
          user.truckRegistered,

      },

    });

  }

  catch (error) {

    console.log(
      "SIGNUP ERROR:",
      error
    );


    return res.status(500).json({

      message:
        "Signup failed",

      error:
        error.message,

    });

  }

};



// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {

  try {

    const {
      email,
      password,
    } = req.body;


    // ---------------------------------------------
    // REQUIRED FIELDS
    // ---------------------------------------------

    if (
      !email ||
      !password
    ) {

      return res.status(400).json({

        message:
          "Email and password are required",

      });

    }


    // ---------------------------------------------
    // FIND USER
    // ---------------------------------------------

    const user =
      await User.findOne({

        email:
          email.toLowerCase(),

      });


    if (!user) {

      return res.status(401).json({

        message:
          "Invalid email or password",

      });

    }


    // ---------------------------------------------
    // CHECK PASSWORD
    // ---------------------------------------------

    const isPasswordCorrect =
      await bcrypt.compare(

        password,

        user.password

      );


    if (!isPasswordCorrect) {

      return res.status(401).json({

        message:
          "Invalid email or password",

      });

    }


    // =================================================
    // CHECK TRUCK REGISTRATION
    // =================================================

    let truckRegistered = false;

    let registeredTruck = null;


    if (
      user.role === "truck"
    ) {

      console.log(
        "Checking truck for user:",
        user._id.toString()
      );


      // Find truck belonging to this user

      registeredTruck =
        await Truck.findOne({

          userId:
            user._id,

        });


      console.log(
        "Truck found:",
        registeredTruck
      );


      // If truck exists,
      // registration is complete

      if (registeredTruck) {

        truckRegistered =
          true;

      }

    }


    console.log(
      "FINAL TRUCK REGISTERED:",
      truckRegistered
    );


    // =================================================
    // CREATE JWT
    // =================================================

    const token =
      jwt.sign(

        {

          userId:
            user._id,

          role:
            user.role,

        },

        process.env.JWT_SECRET,

        {

          expiresIn:
            "1d",

        }

      );


    // =================================================
    // LOGIN RESPONSE
    // =================================================

    return res.status(200).json({

      message:
        "Login successful",

      token,

      user: {

        id:
          user._id,

        name:
          user.name || null,

        email:
          user.email,

        role:
          user.role,


        // -----------------------------------------
        // TRUCK ID
        // -----------------------------------------

        truckId:

          registeredTruck?.truckId ||

          user.truckId ||

          null,


        // -----------------------------------------
        // DEPOT ID
        // -----------------------------------------

        depotId:

          registeredTruck?.depotId ||

          user.depotId ||

          null,


        // -----------------------------------------
        // TRUCK REGISTERED
        // -----------------------------------------

        truckRegistered:

          truckRegistered,

      },

    });

  }

  catch (error) {

    console.log(
      "LOGIN ERROR:",
      error
    );


    return res.status(500).json({

      message:
        "Login failed",

      error:
        error.message,

    });

  }

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

  register,
  login,

};