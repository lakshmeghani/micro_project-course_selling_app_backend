const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = mongoose.ObjectId

const User = new Schema({
    email: { type: String, unique: true },
    password: String,
    firstName: String,
    lastName: String,
    purchases: [ObjectId],
    isCourseMaker: Boolean,
})

const Course = new Schema({
    title: String,
    description: String,
    price: Number,
    imageUrl: String,
    courseMaker: ObjectId
})

const UserModel = mongoose.model("users", User)
const CourseModel = mongoose.model("courses", Course)

module.exports = {
    UserModel,
    CourseModel
}
