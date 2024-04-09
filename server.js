const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
    key: fs.readFileSync(path.resolve(__dirname, '../private.key')),
    cert: fs.readFileSync(path.resolve(__dirname, '../certificate.crt')),
    ca: fs.readFileSync(path.resolve(__dirname, '../ca_bundle.crt'))
};

const app = require('./index'); // Assuming your main application file is named index.js

https.createServer(options, app).listen(2500, () => {
    console.log('Server running on port 2500');
});