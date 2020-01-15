const inquirer = require('inquirer');
const pdf = require('html-pdf');
const fs = require('fs');
const https = require('https');
const generator = require('./generateHTML.js');
const debug = false

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

// Write text data to a file
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

// Write HTML to a PDF
function writeToPdf(fileName, html) {
    var options = { format: 'Letter' };
    pdf.create(html, options).toFile(fileName, function (err, res) {
        if (err) return console.log(err);
        console.log(res);
    });
}

// Get user info from github
// Returns an array of promises
// [0] - User Info
// [1] - Star Info
function getUser(name) {
    console.log("Name", name);
    const path = `/users/${name}`;

    // Get the User Data
    let promise = getApiData(path);
    // Get the User Starred List
    let promiseStar = getApiData(path + "/starred");
    return Promise.all([promise, promiseStar]);
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
    // Return a promise
    return new Promise(function (resolve, reject) {
        let result = "";
        const req = https.request(options, function (res) {
            if (debug) {
                console.log(`statusCode: ${res.statusCode}`);
            }

            // Data chunk received handler
            res.on('data', function (d) {
                result += d;
            });

            // All Data Received - Call resolve to notify caller
            res.on('end', function () {
                // Parse the result to an object 
                // and pass it to resolve()
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
function init() {
    // Prompt user with questions
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
            return getUser(response.name);
        })
        .then(function (responses) {
            let [response, responseStar] = responses;
            // Convert API response object into params object
            if (debug) {
                console.log("Response", response);
            }
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
            if (debug) {
                console.log("STAR RESPONSE", responseStar);
                console.log("table = params");
                console.table(params);
            }
            return generator.generateHTML(params);
        }).then(function (response) {
            let html = response;
            writeToFile("temp.html", html);
            writeToPdf("temp.pdf", html);
        })
        .catch(function (error) {
            console.log("CATCH-ERROR:", error);
        });
}

init();