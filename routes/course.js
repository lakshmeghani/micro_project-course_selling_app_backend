const express = require('express')
const { userAuth, courseMakerAuth } = require('../middlewares/auth')
const { CourseModel } = require('../db')
const { z } = require('zod')

const router = express.Router()
router.use(express.json())

// ZOD - user data validation
function zodValidation(dataObject) {
    const CourseZod = z.object({
        title: z.string(),
        description: z.string(),
        price: z.number(),
        imageUrl: z.string(),
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

// view all purchased courses
router.get('/purchases', userAuth, (req, res) => {

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
router.delete('/delete', courseMakerAuth, (req, res) => {

})

// if coursemaker, edit the course content of a course
router.put('/course-content', courseMakerAuth, (req, res) => {

})

module.exports = router
