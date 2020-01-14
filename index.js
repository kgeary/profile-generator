var inquirer = require('inquirer');
var generator = require('./generateHTML.js');
var fs = require('fs');
var https = require('https');

// Questions to prompt the user with
const questions = [
    {
        type: "input",
        message: "What github profile do you want to get",
        name: "name",
    },
    {
        type: "list",
        message: "What color background do you want to use",
        choices: Object.keys(generator.colors),
        name: "color",
    },
];

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
function getUser(name) {
    console.log("Name", name);
    const path = `/users/${name}`;

    // Get the User Data
    let promise = getApiData(path);
    // Get the User Starred List
    let promiseStarred = getApiData(path + "/starred");
    return [promise, promiseStarred];
}

// Return a promise to get data from the github api
// returns a response object
function getApiData(path) {
    /* Request option parameters */
    const host = 'api.github.com';
    const options = {
        hostname: host,
        path: path,
        method: 'GET',
        headers: { 'User-Agent': 'profile-generator' }
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

// Initialize and run the script
async function init() {
    // Prompt user with questions
    // Get the user profile
    // Scrape the profile for data needed
    // Generate a new HTML
    // Generate a new PDF
    let userColor;
    let params = {};

    inquirer
        .prompt(questions)
        .then(function (response) {
            // User Input Responses received
            // store the color for later
            // get API data
            userColor = response.color;
            return Promise.all(getUser(response.name));
        })
        .then(function (responses) {
            let [response, responseStar] = responses;
            // Convert API response object into params object
            console.log("Response", response);
            params = {
                name: response.name,
                login: response.login,
                img: response.avatar_url,
                bio: response.bio,
                blog: response.blog,
                location: response.location,
                url: response.html_url,
                publicRepos: response.public_repos,
                followers: response.followers,
                following: response.following,
                color: userColor,
                stars: responseStar.length,
            };

            console.log("STAR RESP", responseStar);

            console.log("Get User Response Data");
            console.table(params);
            let html = generator.generateHTML(params);
            writeToFile("temp.html", html);
            console.log(html);
        })
        .catch(function (error) {
            console.log("CATCH-ERROR:", error);
        });
}

init();