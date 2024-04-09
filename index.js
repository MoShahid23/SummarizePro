const express = require('express');
const session = require('express-session');
var ejs = require('ejs')
const path = require('path');
const mysql = require('mysql');
const crypto = require('crypto');

// Generating secret key
const secretKey = crypto.randomBytes(32).toString('hex');

const app = express();
const port = 80;

app.set('baseUrl', '');

app.use(session({
    secret: secretKey,
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days in milliseconds
      },
}));

// Middleware to parse the request body for form submissions
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MySQL connection configuration
const dbConnection = mysql.createConnection({
    host: 'localhost',
    user: 'appuser',
    password: 'app2027',
    database: 'spro', // Database name
});
// Connect to MySQL
dbConnection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL as id ' + dbConnection.threadId);
});
global.db = dbConnection;

//quick check to see if session should be able to access file
function isAuthorized(req, res, next) {
    const requestedFile = req.originalUrl;
    const userEmail = req.session.userEmail;
    // Check if the requested file belongs to the authenticated user
    if (requestedFile.includes(userEmail)) {
        return next(); // User is authorized, continue
    }
    res.status(403).send('Unauthorized'); // Send 403 Forbidden if user is not authorized
};

// Middleware to serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', isAuthorized, express.static(path.join(__dirname, 'uploads')));

// Set the 'views' directory and EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Tells Express how we should process html files
// We want to use EJS's rendering engine
app.engine('html', ejs.renderFile);

var data = {appName: "SummarizePro"};
require("./routes/main")(app, data);

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// Starting the server
app.listen(port, () => console.log(`SummarizePro is live on port ${port}!`))
