// ********** Imports **************
const express = require("express")
const router = require("./server/router")
const cookieParser = require("cookie-parser")
const bodyParser = require("body-parser")
const connectDB = require('./server/dbController')
const { logger } = require("./server/logger")
// ********** End Imports **********

// ********** Initialization **************
const app = express()
require('dotenv').config()
logger.info("Running in " + process.env.NODE_ENV + " mode")
connectDB()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static("public"))
app.use(cookieParser())
// ********** End Initialization **********

app.use("/", router)

app.set("view engine", "ejs")

app.listen(process.env.PORT, () => logger.info(`server running on port: http://localhost:${process.env.PORT}`))