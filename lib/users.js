const uuid = require("uuid/v4");

const users = {};

const find = id => users[id];

const findByEmail = email =>
  Object.values(users).filter(user => user.email === email)[0];

const register = (email, password) => {
  const id = uuid();
  const newUser = {
    id: id,
    email: email,
    password: password
  };

  users[id] = newUser;
  return newUser;
};

const login = (email, password) => {
  const user = findByEmail(email);

  if (user) {
    return password === user.password;
  } else {
    return false;
  }
};

module.exports = {
  find: find,
  register: register,
  login: login
};
