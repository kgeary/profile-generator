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
  // Set a default value for blog if null.
  if (!data.blog) {
    data.blog = "#";
  } else if (!data.blog.includes("http")) { // Add https:// if http not found
    data.blog = "https://" + data.blog;
  }
}

// Parse the api reponse data into an object with just the data we need
function parseResponse(resUser, resRepos, userColor) {
  const data = {
    name: resUser.name,
    login: resUser.login,
    img: resUser.avatar_url,
    bio: resUser.bio,
    blog: resUser.blog,
    location: resUser.location,
    url: resUser.html_url,
    publicRepos: resUser.public_repos,
    followers: resUser.followers,
    following: resUser.following,
    color: userColor,
    stars: resRepos.reduce((acc, el) => acc + el.stargazers_count, 0),
  }

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

    // get User API data
    const urlUser = `https://api.github.com/users/${name}`;
    // get the User Repositories (1st 100 results)
    const urlRepos = `https://api.github.com/users/${name}/repos?page=1&per_page=100`;
    // Wait for both requests to finish
    const responses = await Promise.all(
      [
        axios.get(urlUser),
        axios.get(urlRepos),
      ]);

    // Then after All API Calls returned successfully
    // Set the individual response objects to the 'data' field of their response
    const [resUser, resRepos] = responses.map(res => res.data);

    // Save the user data to a variable
    data = parseResponse(resUser, resRepos, userColor);

    // Determine how many pages we need and create requests for each of them
    let pages = Math.ceil(data.publicRepos / 100);
    
    // For each remaining page we need to get add a new get request to the array
    let repoRequests = [];
    for (let i=2; i <= pages; i++) {
      const url = `https://api.github.com/users/${name}/repos?page=${i}&per_page=100`;
      repoRequests.push(axios.get(url));
    }
    if (debug) { console.log("Total # of Repo Pages", pages); }

    // Wait for all remaining pages to come in
    let repoResponses = await Promise.all(repoRequests);
    
    // Add the stars from each page of responses
    repoResponses.forEach(res => {
      // Check each repositories stargazers_count. Use reduce to sum them all up
      const stars = res.data.reduce((acc, el) => acc + el.stargazers_count, 0);
      // Add the stars found on this page of repositories to the overall count
      data.stars += stars;
    });

    // Debug - Print the responses and the data object
    if (debug) {
      console.log("User Api Response", resUser);
      console.log("Repo Api Response", resRepos);
      console.log("Additional Pages", repoResponses);
      console.log("data object", data);
    }

    // Generate the HTML based off the newly acquired data
    const html = generator.generateHTML(data);

    // Get the filename to use for the output PDF
    if (data.name === DEFAULT_NAME) {
      data.name = data.login;
    }

    // Set the output filename. Replace whitespace in name if needed
    fname = tmpFiles ? 'temp' : `${data.name.replace(/\s/g, '_')}`;

    // Write the html data to a Text File
    await writeToFile(TMP_HTML, html);

    // Write the html data to a PDF
    await writeToPdf(TMP_HTML, `${fname}`);

    // Print Final Success to Alert User
    console.log("Success");
  } catch (error) { // Handle Errors here

    // Print the Error if debug mode active
    if (debug) {
      console.log(error);
    }

    // Handle Error - Print a message alerting the user what went wrong
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
