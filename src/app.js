require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const {default: helmet} = require('helmet');
const compression = require('compression');
const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(compression())
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'authorization', 'refresh-token', 'x-client-id'],
  }));
  
require('./db/init.mongo')




app.use('/', require('./routes'))

app.use((req, res, next)=>{
    const error = new Error('Not Found')
    error.status = 404
    next(error)
})

app.use((error, req, res, next)=>{
    const errorCode = error.status || 500;
    res.status(errorCode).json({
        status: 'error',
        code: errorCode,
        message: error.message,
        stack: error.stack
    })
})
module.exports = app;