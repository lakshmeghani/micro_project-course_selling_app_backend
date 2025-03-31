const express = require("express")
const { UserModel } = require('../db')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { z } = require('zod')
require('dotenv').config()

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET

router.use(express.json())

// Function for validating user input with ZOD
function zodValidation(dataObject) {
    const UserZod = z.object({
        email: z.string().email(),
        password: z.string(),
        firstName: z.union([z.string(), z.undefined()]),
        lastName: z.union([z.string(), z.undefined()]),
        isCourseMaker: z.union([z.boolean(), z.undefined()]),
    })

    let verifiedData = UserZod.parse({
        email: dataObject.email,
        password: dataObject.password,
        firstName: dataObject.firstName,
        lastName: dataObject.lastName,
        isCourseMaker: dataObject.isCourseMaker
    })
    return verifiedData
}

// Function for hashing the user-given password for storing in database
function bcryptHashing(password) {
    let saltRounds = 15 // More the number, more the security
    let hashedPassword = bcrypt.hashSync(password, saltRounds)
    return hashedPassword
}

// Function for assigning web tokens for authentication sessions
// - eliminateing re-signups - reducing database-calls
function genToken({ userId, isCourseMaker }) {
    let token = jwt.sign({
        userId,
        isCourseMaker
    }, JWT_SECRET) // token generated
    console.log(token)
}
// --------------------------------------------------------------------------------------------------------------------
// User-Related routes
router.post("/signup", (req, res) => {

    // Obtaining user data
    let dataObject = {
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        isCourseMaker: req.body.isCourseMaker
    }

    // Verifying data with ZOD
    let verifiedData;
    try {
        verifiedData = zodValidation(dataObject)
    } catch (err) {
        return res.status(403).json({
            "error": "ZOD",
            "hint": "Please enter correct type of data",
            "message": err
        })
    }
    // verification complete

    // Hashing the data with BCRYPT
    let hashedPassword;
    try {
        hashedPassword = bcryptHashing(verifiedData.password)
    } catch (err) {
        return res.json({
            "error": "BCRYPT",
            "hint": "error in salting or hashing algorithm for computing password",
            "message": err,
        })
    }

    // Saving data to database + Assigning a jsonwebtoken
    const newUser = new UserModel({
        email: verifiedData.email,
        password: hashedPassword,
        firstName: verifiedData.firstName,
        lastName: verifiedData.lastName,
        purchases: [],
        isCourseMaker: verifiedData.isCourseMaker
    })

    newUser.save()
        .then((data) => {
            // Generating new jsonwebtoken
            try {
                genToken({
                    userId: data._id,
                    isCourseMaker: verifiedData.isCourseMaker
                }) // token generated
            } catch (err) {
                res.status(403).json({
                    "error": "JSONWEBTOKEN",
                    "message": err,
                })
            }

            res.json({
                "success": "All processes successfully completed",
                "message": "ZOD + BCRYPT + JSONWEBTOKEN + DB_WRITE = User successfully logged in",
            })
        })
        .catch((err) => {
            res.status(403).json({
                "error": "writing data to database",
                "message": err,
            })
        })
})

router.post("/login", (req, res) => {
    let dataObject = req.body // has to have email, password, and isCourseMaker

    // First Validating Email
    let verifiedData;
    try {
        verifiedData = zodValidation(dataObject)
    } catch (err) {
        return res.status(403).json({
            "error": "ZOD",
            "hint": "enter proper credentials",
            "message": err,
        })
    }

    async function verifyCredentials() {
        // Querying database for user credentials
        let dbUser = await UserModel.find({
            email: dataObject.email
        })

        if (dbUser.length == 1) {
            if (bcrypt.compareSync(verifiedData.password, dbUser[0].password)) {

                // generating a new web-token
                try {
                    genToken({
                        userId: dbUser[0]._id,
                        isCourseMaker: dbUser[0].isCourseMaker
                    }) // token generated
                } catch (err) {
                    res.status(403).json({
                        "error": "JSONWEBTOKEN",
                        "hint": "error generating token",
                        "message": err,
                    })
                }

                res.json({
                    "success": "user logged in successfully",
                    "message": "ZOD + BCRYPT + JSONWEBTOKEN (NEW) + DB_READ = user logged in",
                })
            } else {
                res.status(403).json({
                    "error": "database - password",
                    "hint": "mismatched credentials",
                    "message": "given password does not match with given username",
                })
            }
        } else {
            res.status(403).json({
                "error": "database - email",
                "message": "email entered does not exist in database",
                "fix": "please signup or enter correct credentials"
            })
        }
    }
    verifyCredentials()
})

router.get("/profile", (req, res) => {
    let token = req.headers.authorization
    let verifiedToken;

    //verifying the token
    try {
        verifiedToken = jwt.verify(token, JWT_SECRET)
    } catch (err) {
        res.status(403).json({
            "error": "jsonwebtoken - received token from user",
            "hint": "token verification failed",
            "message": err,
        })
    } // token verification handled

    async function findUser() {
        let userDb = await UserModel.findById(verifiedToken.userId)
        return userDb
    }

    async function showData() {
        try {
            let data = await findUser() // comes as an array
            res.json({
                "success": "data retreived from database",
                "data": data,
            })
        } catch (err) {
            res.status(403).json({
                "error": "database - user data",
                "hint": "failed to retrieve user data",
                "message": err,
            })
        }
    }
    showData() // showing data
})

module.exports = router
