const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const blacklistedTokenController = require("../controllers/blacklistedToken.controllers");
const asyncMiddleware = require("../middleware/async.middleware");

// This is used for authenticating the user
router.post(
  "/",
  auth,
  asyncMiddleware(blacklistedTokenController.addTokenToBlacklist)
);

module.exports = router;
