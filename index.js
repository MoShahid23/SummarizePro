const { log } = require('console');
const express = require('express');
const { SourceTextModule } = require('vm');
const app = express();
const port = 8000;


app.get('/', (req, res) => {
    res.send('Hello World!')
});
  
app.listen(port, () => {
    console.log(`SummarizePro is live on port: ${port}`)
});

app.get('/python', invokePythonMorrocanTranslator);

// Step 2: 
// Create a callback function that handles requests to the '/Morrocan_NLP' endpoint
function invokePythonMorrocanTranslator(req, res) {

    // Importing Node's 'child_process' module to spin up a child process. 
    // There are other ways to create a child process but we'll use the 
    // simple spawn function here.
    var spawn = require("child_process").spawn;
    console.log("spawning process")

    // The spawned python process which takes 2 arguments, the name of the 
    // python script to invoke and the query parameter text = "mytexttotranslate"
    var process = spawn('python', 
        [
            "./test.py",
            "dnliisakdbsaj;d"
        ]
    );

    // Step 3:
    // Listen for data output from stdout, in this case, from "morrocan_nlp.py"
    process.stdout.on('data', function(data) {

        // Sends the output from "morrocan_nlp.py" back to the user
        res.send(data.toString());

    });

};