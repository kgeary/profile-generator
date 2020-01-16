const inquirer = require('inquirer');
const puppeteer = require('puppeteer');
const util = require('util');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const generator = require('./generateHTML.js');
const TMP_HTML = '.tmp.html';

// Debug Flags
const debug = false || (process.argv[2] === "debug");
const tmpFiles = debug || false;
const DEFAULT_NAME = "No Name Provided";

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
async function writeToPdf(inFile, outFile) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const filePath = path.resolve(`${inFile}`);
  await page.goto(`file:${filePath}`, { waitUntil: 'networkidle2' });
  await page.pdf({ path: `${outFile}.pdf`, format: 'A4' });
  // If debug - create a screenshot image
  if (debug) {
    await page.setViewport({
      width: 1200,
      height: 1550,
      deviceScaleFactor: 1,
    });
    await page.screenshot({ path: "tmp.png" });
  }
  return browser.close();
}

// Format input data like we need it
function formatData(data) {
  // Create a maps link if location was specified 
  if (data.location) {
    data.map = "https://www.google.com/maps/place/" +
      data.location.replace(/\s/g, "+");
  } else {
    data.location = "No Location Provided";
    data.map = "#";
  }

  // Set a default value for name if null
  if (!data.name) {
    data.name = data.login;
  }
  // Set a default value for bio if null
  if (!data.bio) {
    data.bio = "";
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
async function init() {
  let data = {}; // Store data parameters needed to fill in the html
  let fname;
  try {
    // Prompt user with questions
    const userResponse = await inquirer.prompt(questions);
    const name = userResponse.name;
    const userColor = userResponse.color;

    // get API data returns array of promises
    const responses = await Promise.all(
      [
        axios.get(`https://api.github.com/users/${name}`),
        axios.get(`https://api.github.com/users/${name}/starred`),
      ]);

    // Then after All API Calls returned successfully
    // Set the individual response objects to the 'data' field of the responses
    const [rspUser, rspStar] = responses.map(x => x.data);

    // Save the user data to a variable
    data = parseResponse(rspUser, rspStar, userColor);

    // Debug - Print the responses and the data object
    if (debug) {
      console.log("User Api Response", rspUser);
      console.log("Star Api Response", rspStar);
      console.log("data object", data);
    }

    // Generate the HTML based off the newly acquired data
    const html = generator.generateHTML(data);

    // Get the filename to use for the output pdf
    if (data.name === DEFAULT_NAME) {
      data.name = data.login;
    }
    fname = tmpFiles ? 'temp' : `${data.name.replace(/\s/g, '_')}`;

    // Write the html data to a Text File
    await writeToFile(TMP_HTML, html);

    // Write the html data to a PDF
    await writeToPdf(TMP_HTML, `${fname}`);

    console.log("Success");
  } catch (error) {

    if (debug) {
      console.log(error);
    }
    // Handle Error
    if (error.response.status === 404) {
      console.log("ERROR:", "User Not Found!");
    }
    else { // Display the provided error message
      console.log("ERROR:", error.message);
    }

  } finally {
    // Delete the temporary HTML file if it exists
    if (fs.existsSync(TMP_HTML)) {
      const unlinkAsync = util.promisify(fs.unlink);
      await unlinkAsync(TMP_HTML);
    }
  }
}

// Alert the user we are in debug mode. Extra output expected
if (debug) {
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.log("Debug Mode Active");
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}
init();
