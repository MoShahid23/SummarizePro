note for anybody not on the team: you will not be able to run this project if you do not have access to the specific credentials for it. You can however modify the python scripts to initialize with your own custom google project, and then go from there using this as a general guide.

Prerequisites:

- NodeJS
- Python3.10
- gcloud
- NPM
- MySql Server


Start by ensuring gcloud is initiated.
- gcloud init

Follow the onscreen prompts until process is completed.
Next, run

- gcloud auth login

This will prompt you to login, if on a desktop. Else it will provide a link. you must run it on your local machine and follow the onscreen prompts.

Now, given that you have access to the service worker credentials, run the following with the path to it on your system. (replace export with set on windows.)

- export export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

With this path variable set, you may run the following in your terminal:

- gcloud config set project "summarizepro"

- gcloud auth activate-service-account summarizepro-685@summarizepro.iam.gserviceaccount.com --key-file path/to/credentials.json

- gcloud projects add-iam-policy-binding summarizepro --member serviceAccount:summarizepro-685@summarizepro.iam.gserviceaccount.com --role roles/reader

- gcloud projects add-iam-policy-binding summarizepro --member user:summarizep@gmail.com --role roles/reader

- gcloud services enable documentai.googleapis.com storage.googleapis.com aiplatform.googleapis.com

Next, install the following packages for Python3.10. You may have to change pip3 to 'pip' or something else depending on your configuration.

- pip3 install google-cloud-documentai google-cloud-storage tenacity pandas vertexai

At this stage, if everything went well, you should be able to run all of the python scripts in the project.
Now, similar to the situation with pip3, if you do not run python3.10 with 'python3', you must change a few lines in main.js in the root directory of the project. In this file there will be a number of functions that are named starting with 'InvokePython....'. Near the top of these functions, there is a line that looks like this

- var process = spawn('python3' //rest of line

you must change the 'python3' to whatever applies to you. NOTE: if you would like to use the python scripts in a venv, you must alter this code here so that it first activates the venv. Please refer to this example code snippet below for help applying this to the file:

- // Define the path to your Python script within the virtual environment
- const pythonScriptPath = path.join(__dirname, 'path_to_your_script/question_processing.py');
- // Activate the virtual environment and then spawn the Python process
- const process = spawn('bash', ['-c', `. venv/bin/activate && python3 ${pythonScriptPath} ${req.body.filename.replace(".pdf", "")} 'Chat History:\n${req.body.contextual_history}\nPrompt:\n${req.body.question}'`]);

Now that all bits related to python are setup, you may move on to getting the nodejs server running. first thing to do is to run the create_db.sql script in mysql. Do this however you please, below is a command line example:

- cd /path/to/directory
- mysql -u username -p
- source create_db.sql;
- exit;

Install all npm packages required:

- npm install

And now you should be ready to start the application:

- node index.js

Navigate to 'localhost/' in your web browser to use the application.