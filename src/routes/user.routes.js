const validateMiddleware = require("../middleware/validate.middleware");
const admin = require("../middleware/admin.middleware");
const staffMiddleware = require("../middleware/staff.middleware");
const auth = require("../middleware/auth.middleware");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middleware/async.middleware");
const validateObjectId = require("../middleware/validateObjectId.middleware");
const userController = require("../controllers/user.controllers");
const managerMiddleware = require("../middleware/manager.middleware");
const adminOrManagerMiddleware = require("../middleware/adminOrManager.middleware");
const validateroleMiddleware = require("../middleware/validaterole.middleware");
const {
  validate,
  validatePatch,
  validateUpdatePassword,
  validateResetPassword,
  validateRequestResetPassword,
} = require("../model/user.model");

// This is used for registering a new user.
router.post(
  "/",
  auth,
  adminOrManagerMiddleware,
  validateMiddleware(validate),
  asyncMiddleware(userController.register)
);
router.post(
  "/request-reset",
  validateMiddleware(validateRequestResetPassword),
  asyncMiddleware(userController.passwordResetRequest)
);
router.post(
  "/reset-password/:token",
  validateMiddleware(validateResetPassword),
  asyncMiddleware(userController.passwordReset)
);

router.get(
  "/",
  auth,
  adminOrManagerMiddleware,
  asyncMiddleware(userController.fetchAllUsers)
);

router.get(
  "/logged-in-users",
  auth,
  adminOrManagerMiddleware,
  asyncMiddleware(userController.getLoggedInStaffs)
);

router.get(
  "/employees",
  auth,
  adminOrManagerMiddleware,
  asyncMiddleware(userController.getEmployees)
);

router.get(
  "/staff",
  auth,
  staffMiddleware,
  asyncMiddleware(userController.gethUserById)
);

router.get(
  "/staffs",
  auth,
  managerMiddleware,
  asyncMiddleware(userController.getStaffsByDepartments)
);

router.get(
  "/role/:role",
  auth,
  validateroleMiddleware,
  asyncMiddleware(userController.getUsersByRole)
);

router.get(
  "/:id",
  auth,
  validateObjectId,
  adminOrManagerMiddleware,
  asyncMiddleware(userController.gethUserById)
);

router.put(
  "/update-password",
  auth,
  validateMiddleware(validateUpdatePassword),
  asyncMiddleware(userController.updateUserPassword)
);

router.put(
  "/:id",
  validateObjectId,
  // auth is used to make authenticate a user.
  auth,
  admin,
  validateMiddleware(validatePatch),
  asyncMiddleware(userController.updateUserProfile)
);

router.delete(
  "/:id",
  validateObjectId,
  auth,
  admin,
  asyncMiddleware(userController.deleteUserAccount)
);
module.exports = router;
