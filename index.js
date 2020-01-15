const inquirer = require('inquirer');
const pdf = require('html-pdf');
const fs = require('fs');
const https = require('https');
const generator = require('./generateHTML.js');

// Debug Flags
const debug = true;
const tempFiles = true;

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
    return new Promise(function (resolve, reject) {
        fs.writeFile(fileName, data, 'utf8', function (err) {
            if (err) {
                if (debug) { console.log("Error: " + err); }
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Write HTML to a PDF
function writeToPdf(fileName, html) {
    let options = { format: 'Letter' };
    return new Promise(function (resolve, reject) {
        pdf.create(html, options).toFile(fileName, function (err, res) {
            if (err) {
                if (debug) { console.log(err); }
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}

// Get All User info needed from github
// Returns an array of promises
// Promise [0] - User Info
// Promise [1] - Star Info
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
    let data = {};

    inquirer
        .prompt(questions)
        .then(function (response) {
            // User Input Responses received
            // store the color for later
            // get API data returns array of promises
            userColor = response.color;
            return getUser(response.name);
        })
        .then(function (responses) {
            let [rspUser, rspStar] = responses;
            // Convert API response object into params object
            if (debug) {
                console.log("User Api Response", rspUser);
            }

            // Save the user data to a variable
            data = {
                name: rspUser.name,
                login: rspUser.login,
                img: rspUser.avatar_url,
                bio: rspUser.bio,
                blog: rspUser.blog,
                location: rspUser.location,
                url: rspUser.html_url,
                publicRepos: rspUser.public_repos,
                followers: rspUser.followers,
                following: rspUser.following,
                color: userColor,
                stars: rspStar.length,
            };

            if (rspUser.location) {
                data.map = "https://www.google.com/maps/place/" +
                    rspUser.location.replace(" ", "+");
            }

            if (debug) {
                console.log("Star Api Response", rspStar);
                console.log("table = params");
                console.table(data);
            }
            return generator.generateHTML(data);
        }).then(function (response) {
            const fname = (debug || tempFiles) ? 'temp' : `${data.name.replace(' ', '_')}`;
            let html = response;
            writeToFile(`${fname}.html`, html);
            return writeToPdf(`${fname}.pdf`, html);
        }).then(function () {
            console.log("Success");
        })
        .catch(function (error) {
            console.log("CATCH-ERROR:", error);
        });
}

if (debug) {
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("Debug Mode Active");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}
init();