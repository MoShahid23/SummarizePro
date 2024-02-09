const express = require('express');
const path = require('path');
const { spawn } = require("child_process");
const app = express();
const port = 8000;

// Set the 'views' directory and EJS as the templating engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware to serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the homepage
app.get('/', (req, res) => {
    res.render('home'); // This will render 'home.ejs' from the 'views' directory
});

// Route for logging out
app.get('/logout', (req, res) => {
    // Here you should handle your logout logic (clear cookies, sessions, etc.)
    console.log("User logged out.");
    // Redirect to the login page or homepage after logout
    res.redirect('/');
});

// Route for the Python script interaction (if needed)
app.get('/python', invokePythonMoroccanTranslator);

// Callback function that handles requests to the '/Moroccan_NLP' endpoint
function invokePythonMoroccanTranslator(req, res) {
    console.log("Spawning Python process");
    var process = spawn('python', ["./test.py", req.query.text]); // Assuming you're passing text query parameter

    process.stdout.on('data', (data) => {
        res.send(data.toString());
    });
    
    process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    process.on('close', (code) => {
        if (code !== 0) {
            console.error(`Process exited with code: ${code}`);
        }
    });
};

// Starting the server
app.listen(port, () => {
    console.log(`SummarizePro is live on port: ${port}`);
});
