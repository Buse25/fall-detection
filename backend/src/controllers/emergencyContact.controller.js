const EmergencyContact = require("../models/EmergencyContact");

const setOtherContactsNonPrimary = async (userId, excludeId = null) => {
  const filter = { userId };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  await EmergencyContact.updateMany(filter, { isPrimary: false });
};

const createEmergencyContact = async (req, res) => {
  try {
    const { name, phone, relationship, isPrimary = false } = req.body;
    const userId = req.user._id;

    if (isPrimary === true) {
      await setOtherContactsNonPrimary(userId);
    }

    const emergencyContact = await EmergencyContact.create({
      userId,
      name,
      phone,
      relationship,
      isPrimary,
    });

    return res.status(201).json({
      success: true,
      message: "Emergency contact created successfully",
      data: emergencyContact,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while creating emergency contact",
      error: error.message,
    });
  }
};

const getEmergencyContacts = async (req, res) => {
  try {
    const emergencyContacts = await EmergencyContact.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: emergencyContacts.length,
      data: emergencyContacts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching emergency contacts",
      error: error.message,
    });
  }
};

const getEmergencyContactById = async (req, res) => {
  try {
    const emergencyContact = await EmergencyContact.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!emergencyContact) {
      return res.status(404).json({
        success: false,
        message: "Emergency contact not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: emergencyContact,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching emergency contact",
      error: error.message,
    });
  }
};

const updateEmergencyContact = async (req, res) => {
  try {
    const updateData = {};
    const allowedFields = ["name", "phone", "relationship", "isPrimary"];

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field];
      }
    });

    if (updateData.isPrimary === true) {
      await setOtherContactsNonPrimary(req.user._id, req.params.id);
    }

    const emergencyContact = await EmergencyContact.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      updateData,
      { returnDocument: "after" }
    );

    if (!emergencyContact) {
      return res.status(404).json({
        success: false,
        message: "Emergency contact not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Emergency contact updated successfully",
      data: emergencyContact,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while updating emergency contact",
      error: error.message,
    });
  }
};

const deleteEmergencyContact = async (req, res) => {
  try {
    const emergencyContact = await EmergencyContact.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!emergencyContact) {
      return res.status(404).json({
        success: false,
        message: "Emergency contact not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Emergency contact deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while deleting emergency contact",
      error: error.message,
    });
  }
};

module.exports = {
  createEmergencyContact,
  getEmergencyContacts,
  getEmergencyContactById,
  updateEmergencyContact,
  deleteEmergencyContact,
};
