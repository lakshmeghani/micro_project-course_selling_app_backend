const express = require('express')
const { userAuth, courseMakerAuth } = require('../middlewares/auth')
const { CourseModel } = require('../db')
const { z } = require('zod')

const router = express.Router()
router.use(express.json())

// ZOD - user data validation
function zodValidation(dataObject) {
    const CourseZod = z.object({
        title: z.union([z.string(), z.undefined()]),
        description: z.union([z.string(), z.undefined()]),
        price: z.union([z.number(), z.undefined()]),
        imageUrl: z.union([z.string(), z.undefined()]),
        courseMaker: z.string()
    })

    let verifiedData = CourseZod.parse(dataObject)
    return verifiedData
}

// --------------------------------------------------------------------------------------------------------------------
// All course-realted endpoints

// view all courses
router.get('/all', async (req, res) => {
    let allCourses = await CourseModel.find({})
    res.json({
        "success": "displaying all courses",
        "courses": allCourses
    })
})

// if registered coursemaker, create a course
router.post('/create', courseMakerAuth, async (req, res) => {
    // extracting course details
    let { title, description, price, imageUrl } = req.body

    // Extracting the userId of the courseMaker
    let courseMaker = req.verifiedUserData.userId

    // creating a re-usable data object
    let dataObject = {
        title,
        description,
        price,
        imageUrl,
        courseMaker
    }

    // add ZOD data verification
    let verifiedData;
    try {
        verifiedData = zodValidation(dataObject)
    } catch (err) {
        // returning the error, allowing the developer to handle and not crash server as further try-catch are stopped
        return res.status(403).json({
            "error": "ZOD",
            "hint": "course data type invalid, enter valid data",
            "message": err,
        })
    }

    // Saving course to database
    try {
        await CourseModel.create(verifiedData)
        res.json({
            "success": "successfully created a course in database",
            "message": "ZOD + courseMakerId (from auth) + mongo_db = course registered"
        })
    } catch (err) {
        res.status(403).json({
            "error-message": "write operation to mongodb",
            "hint": "failed to write new course to database",
            "message": err
        })
    }
})

// if coursemaker, delete a course previously made by you
router.delete('/delete', courseMakerAuth, async (req, res) => {
    let dataObject = {}
    dataObject._id = req.body.courseId
    dataObject.courseMaker = req.verifiedUserData.userId

    // using zod for just taking the courseId and courseMakerId as a string 
    let verifiedCourseIds = { courseMaker: dataObject.courseMaker }
    try {
        verifiedCourseIds._id = z.string().parse(dataObject._id)
    } catch (err) {
        return res.status(403).json({
            "error": "ZOD",
            "hint": "invalid data type",
            "message": err,
        })
    }

    // fetch-database call
    try {
        let deletedCourse = await CourseModel.findOneAndDelete(verifiedCourseIds)
        res.json({
            "success": "deleted course successfully",
            "course deleted": deletedCourse.title,
            "courseMaker": deletedCourse.courseMaker,
        })
    } catch (err) {
        res.status(403).json({
            "error": "database call",
            "hint": "cannot delete course entry",
            "message": err,
        })
    }
})

// if coursemaker, edit the course content of a course
router.put('/course-content', courseMakerAuth, async (req, res) => {
    let dataObject = req.body // courseId, title, description, price, imageUrl
    let courseId = dataObject.courseId // found courseId
    delete dataObject.courseId // deleted courseId (title, description, price, imageUrl)
    dataObject.courseMaker = req.verifiedUserData.userId // Added courseMaker (title, description, price, imageUrl, courseMaker)

    // validating data with zod
    let verifiedCourseData
    try {
        verifiedCourseData = zodValidation(dataObject)
    } catch (err) {
        return res.status(403).json({
            "error": "ZOD",
            "hint": "invalid data type",
            "message": err,
        })
    }

    // database fetch-call 
    try {
        let courseJustUpdated = await CourseModel.findOneAndUpdate({
            "courseMaker": req.verifiedUserData.userId, // course is of that particular courseMaker
            "_id": courseId, // that particular course specified by the courseMaker
        }, dataObject)

        if (courseJustUpdated == null) { throw new Error("you cannot change course content of other courseMakers") }
        res.json({
            "success": "successfully updated course-content",
            "updated details": dataObject
        })
    } catch (err) {
        res.status(403).json({
            "error": "database fetch-call",
            "hint": "cannot update course-content in database",
            "message": (typeof err === "string" ? err : err.message)
        })
    }
})

router.get("/myCourses", courseMakerAuth, async (req, res) => {

    // database fetch-call 
    try {
        let myCourses = await CourseModel.find({
            "courseMaker": req.verifiedUserData.userId,
        })
        res.json({
            "success": "displaying all courses created by you...",
            "courses": myCourses,
        })
    } catch (err) {
        res.status(403).json({
            "error": "database fetch-call",
            "hint": "finding courses in database",
            "message": err,
        })
    }

})

module.exports = router
