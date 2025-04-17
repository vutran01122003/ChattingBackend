"use strict";
require("dotenv").config();
const mongoose = require("mongoose");
const {
    db: { user, password, name }
} = require("../configs/config.mongodb");
const connectString = `mongodb+srv://${user}:${password}@chattingapp.v5q87dk.mongodb.net/${name}?retryWrites=true&w=majority`;

console.log({ user, password, name });
class Database {
    constructor() {
        this.connect();
    }

    connect(type = "mongodb") {
        if (true) {
            mongoose.set("debug", true);
            mongoose.set("debug", { color: true });
        }
        mongoose
            .connect(connectString, {
                maxPoolSize: 50
            })
            .then(() => {
                console.log("MongoDB connected");
            })
            .catch((err) => {
                console.log("MongoDB connection error", err);
            });
    }

    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
}

const instanceMongodb = Database.getInstance();
module.exports = instanceMongodb;
