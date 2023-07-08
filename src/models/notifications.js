const mongoose = require("mongoose");
const seSchema = new mongoose.Schema({
  notifiedBy: {
    entity: { type: String, required: true },
    id: { type: String, required: true },
  },
  notifiedTo: {
    entity: { type: String, required: true },
    id: { type: String, required: true },
  },
  subject: {
    type: String,
    required: false,
  },
  notifyMessage: {
    type: String,
    required: true,
  },
  status: {
    enum: ["UN_SEEN", "SEEN"],
    type: String,
    required: true,
    default: "UN_SEEN",
  },
  notificationDate: {
    type: Date,
  },
  notifiedDate: {
    type: Date,
  },
  notificationAction: {
    type: String,
    required: false,
    min: 6,
    max: 255,
  },
  notificationItem: {
    type: { type: String, required: true, min: 6, max: 255 },

    id: {
      type: String,
      required: true,
    },
  },
  redirectUrl: {
    type: String,
    required: false,
    default: "",
    min: 6,
    max: 255,
  },
});
module.exports = mongoose.model("systemNotification", seSchema);
