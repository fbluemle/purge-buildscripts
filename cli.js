#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const findFiles = function (dir, name) {
  let results = [];
  fs.readdirSync(dir).forEach(function (file) {
    file = path.join(dir, file);
    let stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(file, name));
    } else {
      if (path.basename(file) === name) {
        results.push(file);
      }
    }
  });
  return results;
};

function processBuildGradle(file) {
  var buildscriptDetected = false;
  var inBuildscriptSection = false;
  var newBuildGradle = [];

  fs.readFileSync(file, 'utf-8')
    .split(/\r?\n/)
    .forEach(function (line) {
      if (line === 'buildscript {') {
        console.log(
          `Removing buildscript section in ${path.relative(
            process.cwd(),
            file
          )}`
        );
        buildscriptDetected = true;
        inBuildscriptSection = true;
      }
      if (!inBuildscriptSection) {
        newBuildGradle.push(line);
      } else {
        if (line === '}') {
          inBuildscriptSection = false;
        }
      }
    });
  if (buildscriptDetected) {
    fs.renameSync(file, file + '.bak');
    fs.writeFileSync(file, newBuildGradle.join('\n'));
  }
  return buildscriptDetected;
}

const nodeModules = path.join(process.cwd(), 'node_modules');
if (fs.existsSync(nodeModules) && fs.statSync(nodeModules).isDirectory()) {
  let files = findFiles(nodeModules, 'build.gradle');
  if (files.length > 0) {
    console.log(`Found ${files.length} build.gradle file(s).`);
    let modifiedFiles = 0;
    files.forEach(function (file) {
      if (processBuildGradle(file)) {
        modifiedFiles++;
      }
    });
    if (modifiedFiles > 0) {
      console.log(
        `${modifiedFiles} file(s) modified. Original(s) renamed to build.gradle.bak`
      );
    } else {
      console.log('No buildscript sections detected.');
    }
  } else {
    console.log('No build.gradle files found.');
  }
} else {
  console.log(
    'Error: node_modules not found. Please run this script in the root of your app project, after installing packages.'
  );
}
