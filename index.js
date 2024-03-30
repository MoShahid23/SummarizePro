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


// Middleware to serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Set the 'views' directory and EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Tells Express how we should process html files
// We want to use EJS's rendering engine
app.engine('html', ejs.renderFile);

var data = {appName: "SummarizePro"};
require("./routes/main")(app, data);

// Starting the server
app.listen(port, () => console.log(`SummarizePro is live on port ${port}!`))
