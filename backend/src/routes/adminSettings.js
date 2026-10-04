const { Router } = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { getSettings, updateSettings, resetSettings } = require("../services/adminSettings");

const adminSettingsRouter = Router();

adminSettingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getSettings());
  })
);

adminSettingsRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const { aiGeneration, emailSending } = req.body;
    res.json(await updateSettings({ aiGeneration, emailSending }));
  })
);

adminSettingsRouter.delete(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await resetSettings());
  })
);

module.exports = { adminSettingsRouter };
