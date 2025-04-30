const express = require("express");
const router = express.Router();

router.use("/v1/api/user", require("./User"));
router.use("/v1/api", require("./Authenticate"));
router.use("/v1/api", require("./Conversation"));
router.use("/v1/api", require("./Message"));
router.use("/v1/api", require("./Socket"));

module.exports = router;
