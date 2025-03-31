const jwt = require('jsonwebtoken')
require('dotenv').config()
let JWT_SECRET = process.env.JWT_SECRET

function userAuth(req, res, next) {
    const token = req.headers.authorization

    try {
        let verifiedData = jwt.verify(token, JWT_SECRET)
        req.verifiedUserData = verifiedData
        // modifying the request object to have the user's role specified

        next()
    } catch (err) {
        res.status(403).json({
            "error": "JSONWEBTOKEN",
            "hint": "token verification declined",
            "message": err,
        })
    }
}

function courseMakerAuth(req, res, next) {
    const token = req.headers.authorization

    try {
        let verifiedData = jwt.verify(token, JWT_SECRET)
        req.verifiedUserData = verifiedData

        if (verifiedData.isCourseMaker) {
            next()
        } else {
            res.status(403).json({
                "error": "user status and role for application",
                "message": "user is not a course maker and cannot access this page"
            })
        }
    } catch (err) {
        res.status(403).json({
            "error": "JSONWEBTOKEN",
            "hint": "token verification declined",
            "message": err,
        })
    }
}

module.exports = {
    userAuth,
    courseMakerAuth
}
