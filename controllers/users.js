const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const passport = require("passport");
const User = require("../models/user.js")

module.exports.renderSignUpForm = (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signUp = async (req, res) => {
    let { username, email, password } = req.body;

    const newUser = new User({ email, username });
    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
        if(err){
            return next(err);
        }
        req.flash("success", "Welcome to EliteStay!");
        res.redirect("/listings");
    }); 
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

module.exports.Login = (req, res) => {
    req.flash("success", "Welcome back to EliteStay!");

    const redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
};

module.exports.Logout = (req, res) => {
    req.logout((err) => {
        if(err) {
           return next(err);
        } 
        req.flash("success", "You Are Logged Out");
        res.redirect("/listings");
    });
};