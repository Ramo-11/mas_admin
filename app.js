// ********** Imports **************
const express = require("express")
const session = require("express-session")
const MongoStore = require("connect-mongo")
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

// Session configuration
const isProd = process.env.NODE_ENV === "production"
const baseUri = isProd ? process.env.MONGODB_URI_PROD : process.env.MONGODB_URI_DEV
const dbName = isProd ? process.env.DB_NAME_PROD : process.env.DB_NAME_DEV
const mongoUrl = `${baseUri}${baseUri.includes("?") ? "&" : "?"}dbName=${dbName}`

// Trust proxy if behind reverse proxy (nginx, etc.)
if (isProd) {
    app.set('trust proxy', 1)
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'mas-admin-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoUrl,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
        secure: isProd && process.env.FORCE_HTTPS === 'true', // Only secure if explicitly enabled
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: 'lax',
    },
}))
// ********** End Initialization **********

app.use("/", router)

app.set("view engine", "ejs")

app.listen(process.env.PORT, () => logger.info(`server running on port: http://localhost:${process.env.PORT}`))