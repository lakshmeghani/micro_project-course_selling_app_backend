const express = require('express')
const { userAuth, courseMakerAuth } = require('../middlewares/auth')
const { CourseModel } = require('../db')
const router = express.Router()

// for all post requests, data from user is requied
router.use(express.json())

// view all courses
router.get('/all', userAuth(), (req, res) => {

})

// view all purchased courses
router.get('/purchases', userAuth(), (req, res) => {

})

// if registered coursemaker, create a course
router.post('/create', courseMakerAuth(), (req, res) => {

})

// if coursemaker, delete a course previously made by you
router.delete('/delete', courseMakerAuth(), (req, res) => {

})

// if coursemaker, edit the course content of a course
router.put('/course-content', courseMakerAuth(), (req, res) => {

})

module.exports = router
