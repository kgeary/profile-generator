var fs = require('fs');
var https = require('https');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Questions to prompt the user with
const questions = [
    { q: "What github profile do you want to get" },
    { q: "What color background do you want to use" }
];

// Print a Question and Get the answer via standard input
async function getInputPromise(question) {
    // Print the Question and get the answer
    return new Promise(function (resolve) {
        rl.question(question.q + "? ", async function (answer) {
            question.a = answer;
            console.log("ANSWER", question.a);
            await resolve();
        });
    });
}

// Prompt the user with a series of questions and store the results
async function promptUser() {
    for (let index = 0; index < questions.length; index++) {
        try {
            await getInputPromise(questions[index]);
        }
        catch (err) {
            console.log("EXCEPTION", err);
        }
    }
    return Promise.resolve();
}

// Write data to a file
function writeToFile(fileName, data) {
    fs.writeFile(fileName, data, 'utf8', function (err) {
        if (err) {
            console.log("Error: " + err);
            throw err;
        } else {
            // File written
        }
    });
}

// Get user info from github
function getUser(userName) {
    console.log("GET USER");
    console.log("userName", userName);
    const path = `/users/${userName}`;

    getDataPromise(path)
        .then(function (response) {
            // Convert response object into params object
            console.log("Response", response);
            let params = {
                img: response.avatar_url,
                location: response.location,
                url: response.url,
                publicRepos: response.public_repos,
                followers: response.followers,
                following: response.following,
            };

            allDataReceived(params);
        })
        .catch(function (error) {
            console.log("getUser Error", error);
        });
}

// Return a promise to get data from the github api
// returns a response object
function getDataPromise(path) {
    /* Request option parameters */
    const host = 'api.github.com';

    const options = {
        hostname: host,
        path: path,
        method: 'GET',
        headers: {
            'User-Agent': 'profile-generator',
        }
    };
    // Return a promise to get the data
    return new Promise(function (resolve, reject) {
        let result = "";
        const req = https.request(options, function (res) {
            console.log(`statusCode: ${res.statusCode}`);

            // Data chunk received handler
            res.on('data', function (d) {
                result += d;
            });

            // All Data Received - Call resolve to notify caller
            res.on('end', function () {
                // Parse the result string, 
                //convert it to an object 
                // and pass it to the resolve handler
                resolve(JSON.parse(result));
            });
        })

        req.on('error', function (error) {
            // Pass the error to the reject handler
            reject(error);
        })

        req.end();
    });
}

// All Github data received and packaged 
function allDataReceived(params) {
    console.log("All Data Received");
    console.table(params);
}

// Initialize and run the script
async function init() {
    // Prompt user with questions
    // Get the user profile
    // Scrape the profile for data needed
    // Generate a new HTML
    // Generate a new PDF
    await promptUser();
    getUser(questions[0].a);
}

init();