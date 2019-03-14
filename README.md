# User Authentication

Authentication is the process of making sure someone is who they say they are. In web applications this is an important process to protect information. Today we'll be talking about how to implement some basic user authentication in express.

## Routes

The first thing we'll have to do is to start thinking about which routes we'll be using, in our example we'll need 4 routes; 2 to show the login/register pages, and 2 to handle their responses.

| Name                 | Path      | Verb | Purpose                         |
| :------------------- | :-------- | :--: | :------------------------------ |
| Home                 | /         | GET  | Home Page                       |
| Login Form           | /login    | GET  | Shows the Login page            |
| Process Login        | /login    | POST | Processes the login information |
| Register Form        | /register | GET  | Shows the Register page         |
| Process Registration | /register | POST | Processes the registration      |

Later on we'll also be setting up some protected routes, but for now this will be enough.

## Cookies

HTTP is a stateless protocol, which means servers don't have any idea of what the previous request/response cycle did. This makes it really difficult to keep track of who is who from the perspective of the server.

Therefore, we need a way for the browser to be able to give us some extra information with each request that will allow us to figure out who the requesting user is.

This is where an HTTP header helps out: `Cookies`. A cookie gets set by the server through the server's Header `Set-Cookie`. Cookies are small key-value pairs which the browser will store if it supports cookies (all modern browsers support cookies), then send back to the server with following requests.

### Example

Request:

```
GET /index.html HTTP/1.1
Host: www.example.org
...
```

Response, note the `Set-Cookie` header:

```
HTTP/1.1 200 OK
Content-Type: text/html
Set-Cookie: numberOfTimesLoaded=1
Set-Cookie: numberOfTimesLoadedToday=1; Expires=Wed, 14 Mar 2019 23:59:59 EDT
...
```

On the next request cycle:

```
GET /about.html HTTP/1.1
Host: www.example.org
Cookies: numberOfTimesLoaded=1; numberOfTimesLoadedToday=1;
...
```

The response to that cycle:

```
HTTP/1.1 200 OK
Content-Type: text/html
Set-Cookie: numberOfTimesLoaded=2
Set-Cookie: numberOfTimesLoadedToday=2; Expires=Wed, 14 Mar 2019 23:59:59 EDT
```

Here we can see that the server was able to use the information sent to the server through the `Cookies` header to increment the count of the number of times we've been to the site.

### Session vs Persistent Cookies

A session cookie is a cookie which removes itself when the session end, i.e. when the browser is closed. These are useful for storing data which you want to disappear when the browser is closed, like maybe a session when you're logged into your bank account. Above the `numberOfTimesLoaded` cookie was a session cookie.

A persistent cookie on the other hand outlives the lifetime of the browser. This might be used for remembering certain cettings on a web site, such as the selected theme. The way the browser tells the difference between a session cookie and a persistent cookie is by setting either the `Expires` or `Max-Age` attribute on the cookie.

You can read more about the `Cookie` header and it's various options on it's [Wikipedia article](https://en.wikipedia.org/wiki/HTTP_cookie)

## Cookies and User Authentication

In order to be able to make user authentication work we need to leverage Cookies. Luckily, express handles the ability for the server to set cookeis quite easily through the [`res.cookie()`](https://expressjs.com/en/4x/api.html#res.cookie) function.

Being able to read cookie values however requires a piece of middleware: [cookie-parser](https://www.npmjs.com/package/cookie-parser), and express will handles all the nitty gritty of parsing the cookies that the client has sent the server through it's headers.

So there are a few steps that we need to make sure happens in order to get this to work.

1. On Login and/or Register, if everything succeeds we will set a cookie and redirect to the homepage

   ```javascript
   app.post("/login", (req, res) => {
     const email = req.body.email;
     const password = req.body.password;

     if (!email || !password) {
       res.redirect("/login");
       return;
     }

     const user = Users.login(email, password);

     if (user) {
       // Setting the cookie here
       res.cookies("user_email", user.email);
       res.redirect("/");
     } else {
       res.redirect("/login");
     }
   });
   ```

2. When we load the homepage, we'll read the value out of the cookie and pass the found user as a template variable.

   ```javascript
   app.get("/", (req, res) => {
     // Reading the value from the user_email cookie here,
     // note that we'll need to add the cookie-parser module to be
     // able to read cookies.
     const email = req.cookies.user_email;
     const user = Users.findByEmail(email);

     res.render("home", { user: user });
   });
   ```

## Problem #1: We shouldn't be storing user identifiable/sensitive information in the cookies.

We shouldn't be storing any real information in the cookies as they could be read by some untrusted JavaScript code in the browser. So instead of storing the user's email in the cookie, let's store the ID of the user from our database instead. Since this number is unique to our implementation and our application, we're not leaking any important information through the cookie.

```javascript
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    res.redirect("/login");
    return;
  }

  const user = Users.login(email, password);

  if (user) {
    // Changing this to store the id of the user instead.
    res.cookies("user_id", user.id);
    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});
```

We'll also have to update the homepage route to use the ID instead of the email.

```javascript
app.get("/", (req, res) => {
  // Reading the value from the user_email cookie here,
  // note that we'll need to add the cookie-parser module to be
  // able to read cookies.
  const userId = req.cookies.user_id;
  const user = Users.find(userId);

  res.render("home", { user: user });
});
```

## Problem #2: Cookies are editable on the browser

Storing a cookie like this in plaintext is a bad idea, since the cookie stored on the client is editable by the client. This means that I could change the value of the `user_id` cookie to any other user's ID and become that user! This is a big security issue.

In order to solve this, we'll have to encrypt the cookie. Instead of using `res.cookie()` and `req.cookie`, we can leverage yet another node module, this time it's [`cookie-session`](https://www.npmjs.com/package/cookie-session).

This module will handle setting a cookie for us in which we can store values, and it will take care of encrypting the cookie as well as setting a signature cookie to ensure the cookie was not tampered with.

To use this, we first have to setup the middleware. This includes the name of the cookie as well as a list of keys to use when encrypting the cookies:

```javascript
app.use(
  cookieSession({
    name: "session",
    keys: ["this is my super secret key"]
  })
);
```

The we can use `req.session` to store values into the session cookie.

```javascript
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    res.redirect("/login");
    return;
  }

  const user = Users.login(email, password);

  if (user) {
    // Storing a value into the session cookie here.
    req.session.userId = user.id;
    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});
```

To remove any values from the session, or to clear the session entirely, we just set `req.session` to `null`.

```javascript
app.get("/logout", (req, res) => {
  // Clearing the session
  req.session = null;
  res.redirect("/");
});
```

We can also read values from `req.session`

```javascript
app.get("/", (req, res) => {
  // reading a value from the session
  const userId = req.session.userId;
  const user = Users.find(userId);

  res.render("home", { user: user });
});
```

## Problem #3: Passwords are being stored in plaintext.

The last problem to tackle is the fact that we're storing our passwords in plaintext. If our database were to be stolen, then the malicious actors would then have every password clear as day.

In order to solve this problem, we need to encrypt the passwords before we store them to our database. To do this we'll leverage an industry standard for encryption: [bcrypt](https://en.wikipedia.org/wiki/Bcrypt), in this case, we'll be using the node implementation [bcrypt-node](https://www.npmjs.com/package/bcrypt).

Once we've got this together, we can use the methods exposed by the bcrypt module to encrypt and compare the passwords.

```javascript
const SALT_ROUNDS = 10;

const register = (email, password) => {
  const id = nextId++;
  const newUser = {
    id: id,
    email: email,
    // here we're using hashSync to create a hashed version of the plaintext password
    password: bcrypt.hashSync(password, SALT_ROUNDS)
  };

  users[id] = newUser;
  return newUser;
};
```

```javascript
const login = (email, password) => {
  const user = findByEmail(email);

  // Using compareSync to check if the password is the same as the hashed version
  if (user && bcrypt.compareSync(password, user.password)) {
    return user;
  } else {
    return null;
  }
};
```

There are other versions of the two functions which take a callback to handle the completion (as hashing a password can take a long time depending on the number of `SALT_ROUNDS`), but for our example the `hashSync` and `compareSync` functions will work fine.
