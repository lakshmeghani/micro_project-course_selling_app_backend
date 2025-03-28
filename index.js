const express = require('express')
const mongoose = require('mongoose')
const userRoutes = require('./routes/user')
const courseRoutes = require('./routes/course')
require('dotenv').config()

const app = express()

app.use('/user', userRoutes)
app.use('/course', courseRoutes)

async function main() {
    // Connecting to MongoDB database
    let DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING
    await mongoose.connect(DB_CONNECTION_STRING)
    app.listen(3000)
}

main()
