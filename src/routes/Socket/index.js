const { SuccessResponse } = require("../../core/success.response");

const router = require("express").Router();

router.post("/sockets/end-call", async (req, res, next) => {
    try {
        const restUserId = req.body.restUserId;
        const { io, onlineUsers } = global;
        io.to(onlineUsers.get(restUserId)).emit("end_call", { restUserId });

        return new SuccessResponse({
            message: "End call successful",
            metadata: true
        }).send(res);
    } catch (error) {
        console.log(error);
        next(error);
    }
});

module.exports = router;
