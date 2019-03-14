const express = require("express");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const cookieSession = require("cookie-session");

const PORT = process.env.PORT || 8080;

const app = express();

app.set("view engine", "ejs");

// Models
// Look at lib/users.js to see what this exports.
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

// This middleware sets up our session cookie, which will be encrypted using the
// provided key
app.use(
  cookieSession({
    name: "session",
    keys: ["this is my super secret key"]
  })
);

// Add routes here

app.get("/", (req, res) => {
  const userId = req.session.userId;
  const user = Users.find(userId);

  res.render("home", { user: user });
});

app.get("/users.json", (req, res) => {
  res.json(Users.all());
});

// Register

app.get("/register", (req, res) => {
  res.render("auth/register");
});

app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const passwordConfirm = req.body.passwordConfirm;
  console.log(req.body);

  if (!email || !password || !passwordConfirm || password !== passwordConfirm) {
    res.redirect("/register");
    return;
  }

  const user = Users.register(email, password);
  console.log("registered user", user);
  req.session.userId = user.id;
  res.redirect("/");
});

// Login

app.get("/login", (req, res) => {
  res.render("auth/login");
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    res.redirect("/login");
    return;
  }

  const user = Users.login(email, password);

  if (user) {
    req.session.userId = user.id;
    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
});

// Boot server

app.listen(PORT, () => {
  console.log(`Server is listening at http://localhost:${PORT}/`);
});
