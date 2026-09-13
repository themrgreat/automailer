const { Router } = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  listProviders,
  saveProviderConfig,
  clearProviderCredentials,
  setDefaultProvider,
  testProviderConnection,
} = require("../services/ai/config");

const aiProvidersRouter = Router();

aiProvidersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await listProviders());
  })
);

aiProvidersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { fields, model, enabled } = req.body;
    const view = await saveProviderConfig(req.params.id, { fields, model, enabled });
    res.json(view);
  })
);

aiProvidersRouter.delete(
  "/:id/credentials",
  asyncHandler(async (req, res) => {
    const view = await clearProviderCredentials(req.params.id);
    res.json(view);
  })
);

aiProvidersRouter.post(
  "/:id/default",
  asyncHandler(async (req, res) => {
    res.json(await setDefaultProvider(req.params.id));
  })
);

aiProvidersRouter.post(
  "/:id/test",
  asyncHandler(async (req, res) => {
    const { fields } = req.body;
    res.json(await testProviderConnection(req.params.id, fields));
  })
);

module.exports = { aiProvidersRouter };
