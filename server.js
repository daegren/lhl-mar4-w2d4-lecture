const express = require("express");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");

const PORT = process.env.PORT || 8080;

const app = express();

app.set("view engine", "ejs");

// Models

const Users = require("./lib/users");

// Middleware

// Use the body parsing middleware to handle forms
app.use(bodyParser.urlencoded({ extended: false }));

// Use method override to get around a browser limitation:
//   forms can only POST or GET
// By using this middleware we can add a query string param `_method` to change
// the method to PUT or DELETE
app.use(methodOverride("_method"));

// This middleware adds a local helper to all requests. This is used in the
// _header partial to pick out which link is active in the navbar
app.use((req, res, next) => {
  res.locals.activePath = path => (path === req.path ? "active" : "");

  next();
});

// Add routes here

app.get("/", (req, res) => {
  res.render("home");
});

// Register

app.get("/register", (req, res) => {
  res.render("auth/register");
});

app.post("/register", (req, res) => {
  // TODO
});

// Login

app.get("/login", (req, res) => {
  res.render("auth/login");
});

app.post("/login", (req, res) => {
  // TODO
});

// Boot server

app.listen(PORT, () => {
  console.log(`Server is listening at http://localhost:${PORT}/`);
});
