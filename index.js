const inquirer = require('inquirer');
const pdf = require('html-pdf');
const fs = require('fs');
const axios = require('axios');
const generator = require('./generateHTML.js');

// Debug Flags
const debug = false;
const tmpFiles = debug || false;

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

// Format input data like we need it
function formatData(data) {
  // Create a maps link if location was specified 
  if (data.location) {
    data.map = "https://www.google.com/maps/place/" +
      data.location.replace(" ", "+");
  } else {
    data.location = "No Location Provided";
    data.map = "#";
  }

  // Set a default value for name if null
  if (!data.name) {
    data.name = "No Name Provided";
  }
  // Set a default value for bio if null
  if (!data.bio) {
    data.bio = "No Bio Provided";
  }
  // Set a default value for blog if null
  if (!data.blog) {
    data.blog = "#";
  }
}

// Parse the api reponse data into an object with just the data we need
function parseResponse(rspUser, rspStar, userColor) {
  const data = {
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

  // Fix the data up before applying it to html
  formatData(data);
  return data;
}

// Initialize and run the script
function init() {
  let userColor; // Store the user color for use later
  let data = {}; // Store data parameters needed to fill in the html

  // Prompt user with questions
  inquirer
    .prompt(questions)
    .then(function (response) {
      // Then after User Input Responses received
      userColor = response.color;
      const name = response.name;

      // get API data returns array of promises
      return Promise.all(
        [
          axios.get(`https://api.github.com/users/${name}`),
          axios.get(`https://api.github.com/users/${name}/starred`),
        ]);
    })
    .then(function (responses) {
      // Then after All API Calls returned successfully
      // Set the response objects to the 'data' field of the responses
      const [rspUser, rspStar] = responses.map(x => x.data);

      // Convert API response object into params object
      if (debug) { console.log("User Api Response", rspUser); }

      // Save the user data to a variable
      data = parseResponse(rspUser, rspStar, userColor);

      if (debug) {
        console.log("Star Api Response", rspStar);
        console.log("data object");
        console.table(data);
      }

      // Generate the HTML based off the newly acquired data
      const html = generator.generateHTML(data);

      // Get the filename to use for the output (temp when debugging else user_name)
      const fname = tmpFiles ? 'temp' : `${data.name.replace(' ', '_')}`;

      // Write the html data to a Text File
      if (debug) { writeToFile(`${fname}.html`, html); }

      // Write the html data to a PDF
      writeToPdf(`${fname}.pdf`, html);
    }).then(function () {
      // Then after the PDF was written.
      // Everything completed successfully. Pack it up kids
      console.log("Success");
    })
    .catch(function (error) {
      // Ruh roh - something went wrong
      console.log("CATCH-ERROR:", error.message);
      if (debug) {
        console.log(error);
      }
    });
}

// Alert the user we are in debug mode. Extra output expected
if (debug) {
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.log("Debug Mode Active");
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}
init();