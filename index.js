const inquirer = require('inquirer');
const pdf = require('html-pdf');
const fs = require('fs');
const axios = require('axios');
const generator = require('./generateHTML.js');

// Debug Flags
const debug = false;
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

    // Get the User Data and the User Starred List
    return Promise.all(
        [
            getApiData(path),
            getApiData(path + "/starred"),
        ]);
}

// Return a promise to get data from the github api
// returns a response object
function getApiData(path) {
    /* Request option parameters */
    const host = 'api.github.com';
    return axios.get(`https://${host}${path}`);
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
            
            // Set the response objects to the data of the responses
            const [rspUser, rspStar] = responses.map(x => x.data);

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
        }).then(function (html) {
            // Write the HTML to a text file and to a PDF
            const fname = (debug || tempFiles) ? 'temp' : 
                `${data.name.replace(' ', '_')}`;
            writeToFile(`${fname}.html`, html);
            return writeToPdf(`${fname}.pdf`, html);
        }).then(function () {
            console.log("Success");
        })
        .catch(function (error) {
            console.log("CATCH-ERROR:", error.message);
            if (debug) {
                console.log(error);
            }   
        });
}

if (debug) {
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("Debug Mode Active");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}
init();