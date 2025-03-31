const express = require("express")
const { UserModel, CourseModel } = require('../db')
const jwt = require('jsonwebtoken')
const { userAuth } = require('../middlewares/auth')
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

router.get("/profile", userAuth, async (req, res) => {

    let userId = req.verifiedUserData.userId

    try {
        let userDb = await UserModel.findById(userId) // returns only one object as "findById" 
        res.json({
            "success": "data retreived from database",
            "data": userDb,
        })
    } catch (err) {
        res.status(403).json({
            "error": "database - user data",
            "hint": "failed to retrieve user data",
            "message": err,
        })
    }
})

// --------------------------------------------------------------------------------------------------------------------
// All user-course related routes, meant for user
router.post("/purchase-course", userAuth, async (req, res) => {
    let dataObject = req.body
    dataObject.userId = req.verifiedUserData.userId

    // zod validation of user input
    let UserPurchaseZod = z.object({
        userId: z.string(),
        courseId: z.string(),
    })

    let verifiedPurchaseData;
    try {
        verifiedPurchaseData = UserPurchaseZod.parse(dataObject)
    } catch (err) {
        return res.status(403).json({
            "error": "ZOD",
            "hint": "user data type invalid",
            "message": err,
        })
    }

    // finding a course whether it exists or not as an edge case 
    let verifiedCourseId;
    try {
        verifiedCourseId = await CourseModel.findById(verifiedPurchaseData.courseId)
        if (verifiedCourseId == null) { throw new Error("either course doesn't exsit or the Object-Id is wrong") }
    } catch (err) {
        return res.status(403).json({
            "error": "database fetch-call",
            "hint": "course may no longer exist",
            "message": err,
        })
    }

    // finding the user's database object and adding it to the purchases list
    try {
        await UserModel.findOneAndUpdate(
            { _id: verifiedPurchaseData.userId },
            { $push: { purchases: verifiedCourseId } },
        )
        res.json({
            "success": "pushed course-object_id to user-object_id in database",
            "message": "database updated",
        })
    } catch (err) {
        res.status(403).json({
            "error": "saving purchase to user in database",
            "hint": "purchase db-write issue",
            "message": err,
        })
    }
})

// view all purchased courses
router.get('/purchases', userAuth, async (req, res) => {
    let userId = req.verifiedUserData.userId

    // retreiving purchases from database
    let allPurchasesObj
    try {
        let userDb = await UserModel.findById(userId)
        allPurchasesObj = userDb.purchases
    } catch (err) {
        return res.status(403).json({
            "error": "user-database fetch-call",
            "hint": "unable to get user-purchases",
            "message": err,
        })
    }

    // retrieving course-objects from database
    try {
        let allPurchasedCourses = []
        for (const courseObj of allPurchasesObj) {
            allPurchasedCourses.push(
                await CourseModel.findById(courseObj)
            )
        }
        res.json({
            "success": "found all purchased courses and course-details",
            "purchased courses": allPurchasedCourses,
        })
    } catch (err) {
        res.status(403).json({
            "error": "not able to find courses",
            "hint": "database not able to retrieve courses",
            "message": err,
        })
    }
})

module.exports = router
