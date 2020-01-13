var fs = require('fs');
var https = require('https');

// Questions to prompt the user with
const questions = [
  "What github profile do you want to get",
  "What color background do you want to use",
];

// Write data to a file
function writeToFile(fileName, data) {
    fs.writeFile(fileName, data, 'utf8', function(err) {
        if (err) {
            console.log("Error: " + err);
            throw err;
        } else {
            // File written
        }
    });
}

function getUser(userName) {

    const options = {
        hostname: 'api.github.com',
        path: `/users/${userName}`,
        method: 'GET',
        headers : { 'User-Agent' : 'profile-generator',
        }
    };

    let result = "";
    const req = https.request(options, function(res) {
        console.log(`statusCode: ${res.statusCode}`);
        
        // Data chunk received
        res.on('data', function(d) {
            result += d;
        });

        // All Data Received
        res.on('end', function() {
            let response = JSON.parse(result);
            console.log("Final Response", response);
        });
    })
    
    req.on('error', function(error) {
        console.error(error);
    })

    req.end();
}

// Initialize and run the script
function init() {
    // Prompt user with questions
    // Get the user profile
    // Scrape the profile for data needed
    // Generate a new HTML
    // Generate a new PDF
    getUser("kgeary");
}

init();