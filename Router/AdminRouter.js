
const express = require("express");

const router = express.Router();

const {

  createAdminData,

  getAdminData,

  getAdminDataById,

  updateAdminData,

  deleteAdminData,

} = require("../controllers/AdminController");

// Admin authentication middleware

router.use((req, res, next) => {
console.log("SESSION:", req.sessionID, req.session);


  if (!req.session?.user || req.session.user.role !== "admin") {
console.log("SESSION:", req.sessionID, req.session);
    return res.status(401).json({

      success: false,

      message: "Authentication required. Please log in as admin.",

    });

  }

  next();

});

// Create a new report

router.post("/", createAdminData);

// Get all reports

router.get("/", getAdminData);

// Get a single report by ID

router.get("/:id", getAdminDataById);

// Update an existing report

router.put("/:id", updateAdminData);

// Delete a report

router.delete("/:id", deleteAdminData);

module.exports = router; 