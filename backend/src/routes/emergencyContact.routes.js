const express = require("express");

const {
  createEmergencyContact,
  getEmergencyContacts,
  getEmergencyContactById,
  updateEmergencyContact,
  deleteEmergencyContact,
} = require("../controllers/emergencyContact.controller");
const { protect } = require("../middleware/auth.middleware");
const { handleValidationErrors } = require("../middleware/validation.middleware");
const {
  createEmergencyContactValidation,
  updateEmergencyContactValidation,
} = require("../validators/emergencyContact.validators");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  createEmergencyContactValidation,
  handleValidationErrors,
  createEmergencyContact
);
router.get("/", getEmergencyContacts);
router.get("/:id", getEmergencyContactById);
router.put(
  "/:id",
  updateEmergencyContactValidation,
  handleValidationErrors,
  updateEmergencyContact
);
router.delete("/:id", deleteEmergencyContact);

module.exports = router;
