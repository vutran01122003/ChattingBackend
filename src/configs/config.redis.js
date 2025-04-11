const { createClient } = require('redis');
require('dotenv').config();

const REDIS_PASSWORD = process.env.REDIS_PASSWORD

const client = createClient({
    username: 'default',
    password: REDIS_PASSWORD,
    socket: {
        host: 'redis-14219.c292.ap-southeast-1-1.ec2.redns.redis-cloud.com',
        port: 14219
    }
});

client.on('error', err => console.log('Redis Client Error', err));

client.on('connect', () => console.log('Redis Client Connected'));
(async () => {
    try {
        await client.connect();
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
})();
module.exports = client;
