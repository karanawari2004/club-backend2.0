
const mongoose = require("mongoose");
const crypto = require("crypto");

const reportSchema = new mongoose.Schema(
  {
    clubName: {
      type: String,
      required: true,
      trim: true,
    },

    eventDate: {
      type: Date,
      required: true,
    },

    eventEndDate: {
      type: Date,
      required: true,
    },

    eventId: {
      type: String,
      required: true,
      trim: true,
    },

    refNo: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(12).toString("hex"),
      trim: true,
      immutable: true,
    },

    topups: {
      type: Number,
      required: true,
      min: 0,
    },

    sales: {
      type: Number,
      required: true,
      min: 0,
    },

    devices: {
      type: Number,
      required: true,
      min: 0,
    },

    days: {
      type: Number,
      required: true,
      min: 1,
    },

    card: {
      type: Number,
      required: true,
      min: 0,
    },

    cash: {
      type: Number,
      required: true,
      min: 0,
    },

    upi: {
      type: Number,
      required: true,
      min: 0,
    },

    activations: {
      type: Number,
      required: true,
      min: 0,
    },

    // Entered by Admin for each report
    activationRate: {
      type: Number,
      required: true,
      min: 0,
    },

    activationAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    manPower: {
      type: Number,
      required: true,
      min: 0,
    },

    // Entered by Admin for each report
    manpowerRate: {
      type: Number,
      required: true,
      min: 0,
    },

    manpowerAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    breakage: {
      type: Number,
      required: true,
    },

    // Entered by Admin for each report
    licenceFeeRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    licenceFee: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentsTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    // GST percentage: defaults to 18% when not supplied
    gstRate: {
      type: Number,
      required: true,
      default: 18,
      min: 0,
      max: 100,
    },

    // Calculated GST amount
    gst: {
      type: Number,
      required: true,
      min: 0,
    },

    invoiceTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    payable: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Report", reportSchema);
