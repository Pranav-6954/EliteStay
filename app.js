if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const ExpressError = require("./utils/ExpressError");
const User = require("./models/user");

const listingsRouter = require("./routes/listing");
const reviewsRouter = require("./routes/review");
const userRouter = require("./routes/user");

const port = 8080;
const dbUrl = process.env.ATLASDB_URL;

// ====================
// MongoDB Connection
// ====================
async function main() {
  await mongoose.connect(dbUrl);
  console.log("Connected to MongoDB Atlas");
}

main().catch((err) => console.log("MongoDB Connection Error:", err));

// ====================
// Express Config
// ====================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));




// ====================
// Session Store
// ====================
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET || "mysupersecretcode",
  },
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.log("Mongo Session Store Error:", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET || "mysupersecretcode",
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

// ====================
// Passport
// ====================
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ====================
// Global Variables
// ====================
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  res.locals.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  next();
});

// ====================
// Routes
// ====================
app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", userRouter);

// ====================
// 404 Handler
// ====================
app.all("/*splat", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

// ====================
// Error Handler
// ====================
app.use((err, req, res, next) => {
  console.error("APP ERROR HANDLER CAPTURED ERROR:", err);
  let { statusCode = 500, message } = err;
  const displayMessage = message || err.message || "Something Went Wrong!";

  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).render("error.ejs", { message: displayMessage });
});

// ====================
// Server
// ====================
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});