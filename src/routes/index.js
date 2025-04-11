const express = require('express');
const router = express.Router();

router.use('/v1/api/user', require('./User'))
router.use('/v1/api', require('./Authenticate'))
module.exports = router;