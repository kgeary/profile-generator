# profile-generator

### A node based Github Profile Generator
## Purpose
Generate a github user profile with different color schemes.

## Prerequisites
You must have Node installed on your system.

## How To Use
1. Select a github user
2. Select a color scheme
3. Get back a formatted PDF user profile.   
<a href="#screenshots">See examples below</a>

## Usage
From a terminal:
1. Navigate to the working directory.
2. Execute the command:
```
node index.js
```

For extra debug information and an image of the PDF:
```
node index.js debug
```
## Profile Information Included:
* User Image
* Github Account Name
* Name
* Link to Location on google maps
* Link to Repository
* Link to Blog
* \# of Public Repositories
* \# of Followers
* \# of People they are following
* \# of Projects Starred

## Animated Gif
<a href="/screenshots/animated.gif">Animated GIF of the profile generator</a>
<div id="screenshots"></div> 

## Output Examples
<section style="display: flex; flex-wrap: wrap;">
  <div style="padding: 1rem;">
    <h3>Green</h3>
    <img src="screenshots/green.png" width="300px" height="388px">
  </div>
  <div style="padding: 1rem;">
    <h3>Blue</h3>
    <img src="screenshots/blue.png" width="300px" height="388px">
  </div>
  <div style="padding: 1rem;">
    <h3>Pink</h3>
    <img src="screenshots/pink.png" width="300px" height="388px">
  </div>
  <div style="padding: 1rem;">
    <h3>Red</h3>
    <img src="screenshots/red.png" width="300px" height="388px">
  </div>
</section>

## Repository
[profile-generator @ github](https://github.com/kgeary/profile-generator/)