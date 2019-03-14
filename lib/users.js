const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

// This object is our database for our users
const users = {};
let nextId = 1;

// Returns an array of all the user objects in our "database"
const all = () => Object.values(users);

// Finds a user by ID, returns undefined if the ID doesn't exist
const find = id => users[id];

// Finds a user by their email, returns undefined if the email doesn't exist
const findByEmail = email =>
  Object.values(users).filter(user => user.email === email)[0];

// Registers a user and returns the created object.
const register = (email, password) => {
  const id = nextId++;
  const newUser = {
    id: id,
    email: email,
    password: bcrypt.hashSync(password, SALT_ROUNDS)
  };

  users[id] = newUser;
  return newUser;
};

// Checks to see if the email and password have been registered
// Returns the user object if they match, and returns null if it can't be found
const login = (email, password) => {
  const user = findByEmail(email);

  if (user && bcrypt.compareSync(password, user.password)) {
    return user;
  } else {
    return null;
  }
};

module.exports = {
  all: all,
  find: find,
  findByEmail: findByEmail,
  register: register,
  login: login
};
