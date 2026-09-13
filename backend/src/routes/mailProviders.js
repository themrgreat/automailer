const { Router } = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  listProviders,
  saveProviderConfig,
  clearProviderCredentials,
  setDefaultProvider,
  testProviderConnection,
} = require("../services/mailer/config");

const mailProvidersRouter = Router();

mailProvidersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await listProviders());
  })
);

mailProvidersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { fields, enabled } = req.body;
    const view = await saveProviderConfig(req.params.id, { fields, enabled });
    res.json(view);
  })
);

mailProvidersRouter.delete(
  "/:id/credentials",
  asyncHandler(async (req, res) => {
    const view = await clearProviderCredentials(req.params.id);
    res.json(view);
  })
);

mailProvidersRouter.post(
  "/:id/default",
  asyncHandler(async (req, res) => {
    res.json(await setDefaultProvider(req.params.id));
  })
);

mailProvidersRouter.post(
  "/:id/test",
  asyncHandler(async (req, res) => {
    const { fields } = req.body;
    res.json(await testProviderConnection(req.params.id, fields));
  })
);

module.exports = { mailProvidersRouter };
