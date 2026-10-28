
const Report = require("../model/report");
const crypto = require("crypto");

// Generate unique reference number
function generateRefNo() {
  return crypto.randomBytes(12).toString("hex");
}

// Round amount to 2 decimal places
function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

// Check whether a field was supplied
function hasValue(data, ...keys) {
  return keys.some(
    (key) =>
      data[key] !== undefined &&
      data[key] !== null &&
      data[key] !== ""
  );
}

// Read numeric values safely
function getNumber(data, ...keys) {
  for (const key of keys) {
    if (
      data[key] !== undefined &&
      data[key] !== null &&
      data[key] !== ""
    ) {
      const value = Number(data[key]);
      return Number.isFinite(value) ? value : NaN;
    }
  }

  return 0;
}

// Calculate report amounts using submitted rates
function calculateReport(data) {
  const topups = getNumber(data, "topups", "topUps");
  const sales = getNumber(data, "sales");
  const devices = getNumber(data, "devices");
  const days = getNumber(data, "days");

  const card = getNumber(data, "card");
  const cash = getNumber(data, "cash");
  const upi = getNumber(data, "upi");

  const activations = getNumber(
    data,
    "activations",
    "activationCount"
  );

  const manPower = getNumber(
    data,
    "manPower",
    "manpowerCount",
    "manpower"
  );

  const activationRate = getNumber(data, "activationRate");
  const manpowerRate = getNumber(data, "manpowerRate");
  const licenceFeeRate = getNumber(data, "licenceFeeRate");

  const gstRate = hasValue(data, "gstRate")
    ? getNumber(data, "gstRate")
    : 18;

  // Calculate amounts
  const activationAmount = roundMoney(
    activations * activationRate
  );

  const manpowerAmount = roundMoney(
    manPower * manpowerRate
  );

  const breakage = roundMoney(
    topups - sales - activationAmount
  );

  const licenceFee = roundMoney(
    topups * (licenceFeeRate / 100)
  );

  const paymentsTotal = roundMoney(
    card  + upi
  );

  const subTotal = roundMoney(
    licenceFee + activationAmount + manpowerAmount
  );

  const gst = roundMoney(
    subTotal * (gstRate / 100)
  );

  const invoiceTotal = roundMoney(
    subTotal + gst
  );

  const payable = roundMoney(
    topups - cash - invoiceTotal
  );

  return {
    topups,
    sales,
    devices,
    days,
    card,
    cash,
    upi,
    activations,
    activationRate,
    activationAmount,
    manPower,
    manpowerRate,
    manpowerAmount,
    breakage,
    licenceFeeRate,
    licenceFee,
    paymentsTotal,
    subTotal,
    gstRate,
    gst,
    invoiceTotal,
    payable,
  };
}

// Validate the original submitted input
function validateInput(body) {
  if (!body.clubName || !String(body.clubName).trim()) {
    return "Club name is required";
  }

  if (!body.eventId || !String(body.eventId).trim()) {
    return "Event ID is required";
  }

  const eventDate = body.eventDate ?? body.eventStartDate;

  if (!eventDate || !body.eventEndDate) {
    return "Event start date and end date are required";
  }

  const startDate = new Date(eventDate);
  const endDate = new Date(body.eventEndDate);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "Invalid event date";
  }

  if (endDate < startDate) {
    return "Event end date cannot be before start date";
  }

  const requiredFields = [
    ["activationRate", "Activation rate"],
    ["manpowerRate", "Manpower rate"],
    ["licenceFeeRate", "Licence fee rate"],
  ];

  for (const [field, label] of requiredFields) {
    if (!hasValue(body, field)) {
      return `${label} is required`;
    }
  }

  const numericFields = [
    ["topups", "topUps"],
    ["sales"],
    ["devices"],
    ["days"],
    ["card"],
    ["cash"],
    ["upi"],
    ["activations", "activationCount"],
    ["manPower", "manpowerCount", "manpower"],
    ["activationRate"],
    ["manpowerRate"],
    ["licenceFeeRate"],
    ["gstRate"],
  ];

  for (const keys of numericFields) {
    const [field, ...aliases] = keys;

    // GST defaults to 18% if omitted
    if (
      field === "gstRate" &&
      !hasValue(body, "gstRate")
    ) {
      continue;
    }

    if (!hasValue(body, ...keys)) {
      // Preserve the existing optional numeric fields.
      // Required quantities/rates are checked separately below.
      if (
        ["activationRate", "manpowerRate", "licenceFeeRate"].includes(
          field
        )
      ) {
        return `${field} is required`;
      }

      continue;
    }

    const value = getNumber(body, ...keys);

    if (!Number.isFinite(value) || value < 0) {
      return `${field} must be a valid non-negative number`;
    }
  }

  const devices = getNumber(body, "devices");
  const days = hasValue(body, "days")
    ? getNumber(body, "days")
    : 1;

  const activations = getNumber(
    body,
    "activations",
    "activationCount"
  );

  const manPower = getNumber(
    body,
    "manPower",
    "manpowerCount",
    "manpower"
  );

  const licenceFeeRate = getNumber(body, "licenceFeeRate");

  const gstRate = hasValue(body, "gstRate")
    ? getNumber(body, "gstRate")
    : 18;

  if (!Number.isInteger(devices)) {
    return "Devices must be a whole number";
  }

  if (!Number.isInteger(days) || days < 1) {
    return "Days must be a whole number greater than zero";
  }

  if (!Number.isInteger(activations)) {
    return "Activations must be a whole number";
  }

  if (!Number.isInteger(manPower)) {
    return "Manpower must be a whole number";
  }

  if (licenceFeeRate > 100) {
    return "Licence fee rate cannot exceed 100%";
  }

  if (gstRate > 100) {
    return "GST rate cannot exceed 100%";
  }

  return null;
}

// Prepare report fields and calculate all amounts
function prepareReportData(body, refNo = generateRefNo()) {
  const inputData = {
    clubName: String(body.clubName || "").trim(),
    eventId: String(body.eventId || "").trim(),
    eventDate: body.eventDate ?? body.eventStartDate,
    eventEndDate: body.eventEndDate,

    topups: getNumber(body, "topups", "topUps"),
    sales: getNumber(body, "sales"),
    devices: getNumber(body, "devices"),
    days: hasValue(body, "days")
      ? getNumber(body, "days")
      : 1,

    card: getNumber(body, "card"),
    cash: getNumber(body, "cash"),
    upi: getNumber(body, "upi"),

    activations: getNumber(
      body,
      "activations",
      "activationCount"
    ),

    activationRate: getNumber(body, "activationRate"),

    manPower: getNumber(
      body,
      "manPower",
      "manpowerCount",
      "manpower"
    ),

    manpowerRate: getNumber(body, "manpowerRate"),
    licenceFeeRate: getNumber(body, "licenceFeeRate"),

    gstRate: hasValue(body, "gstRate")
      ? getNumber(body, "gstRate")
      : 18,

    refNo,
  };

  return {
    ...inputData,
    ...calculateReport(inputData),
  };
}

// CREATE REPORT
exports.createAdminData = async (req, res) => {
  try {
    console.log("Received report input:", req.body);

    // Validate before converting missing values to defaults
    const inputError = validateInput(req.body);

    if (inputError) {
      return res.status(400).json({
        success: false,
        message: inputError,
      });
    }

    const reportData = prepareReportData(req.body);

    const report = await Report.create(reportData);

    console.log("Report saved to MongoDB:", {
      reportId: report._id,
      clubName: report.clubName,
      eventId: report.eventId,
      activationRate: report.activationRate,
      activationAmount: report.activationAmount,
      manpowerRate: report.manpowerRate,
      manpowerAmount: report.manpowerAmount,
      licenceFeeRate: report.licenceFeeRate,
      licenceFee: report.licenceFee,
      gstRate: report.gstRate,
      gst: report.gst,
      invoiceTotal: report.invoiceTotal,
      payable: report.payable,
    });

    return res.status(201).json({
      success: true,
      message: "Report created successfully",
      report,
    });
  } catch (error) {
    console.error("Create report error:", error);

    return res.status(
      error.name === "ValidationError" ? 400 : 500
    ).json({
      success: false,
      message: error.message || "Failed to create report",
    });
  }
};

// GET ALL REPORTS
exports.getAdminData = async (req, res) => {
  try {
    const reports = await Report.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Get reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
    });
  }
};

// GET REPORT BY ID
exports.getAdminDataById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Get report by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch report",
    });
  }
};

// UPDATE EXISTING REPORT
exports.updateAdminData = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const existingReport = await Report.findById(id);

    if (!existingReport) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    const mergedInput = {
      ...existingReport.toObject(),
      ...req.body,

      topups:
        req.body.topups ??
        req.body.topUps ??
        existingReport.topups,

      eventDate:
        req.body.eventDate ??
        req.body.eventStartDate ??
        existingReport.eventDate,

      activations:
        req.body.activations ??
        req.body.activationCount ??
        existingReport.activations,

      manPower:
        req.body.manPower ??
        req.body.manpowerCount ??
        req.body.manpower ??
        existingReport.manPower,

      activationRate:
        req.body.activationRate ??
        existingReport.activationRate,

      manpowerRate:
        req.body.manpowerRate ??
        existingReport.manpowerRate,

      licenceFeeRate:
        req.body.licenceFeeRate ??
        existingReport.licenceFeeRate ??
        0,

      gstRate:
        req.body.gstRate ??
        existingReport.gstRate ??
        18,
    };

    const inputError = validateInput(mergedInput);

    if (inputError) {
      return res.status(400).json({
        success: false,
        message: inputError,
      });
    }

    const reportData = prepareReportData(
      mergedInput,
      existingReport.refNo
    );

    const updatedReport = await Report.findByIdAndUpdate(
      id,
      reportData,
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Report updated successfully",
      report: updatedReport,
    });
  } catch (error) {
    console.error("Update report error:", error);

    return res.status(
      error.name === "ValidationError" ? 400 : 500
    ).json({
      success: false,
      message: error.message || "Failed to update report",
    });
  }
};

// DELETE REPORT
exports.deleteAdminData = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const deletedReport = await Report.findByIdAndDelete(id);

    if (!deletedReport) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Delete report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete report",
    });
  }
};

// Export calculation helper
exports.calculateReport = calculateReport;
