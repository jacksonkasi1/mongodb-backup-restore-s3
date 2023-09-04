const fs = require("fs");
const path = require("path");
const url = require("url");

const { exec } = require("child_process");
const AWS = require("aws-sdk");
const express = require("express");

const app = express();
app.use(express.json());

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Promisify the exec function
function promisifyExec(command) {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { maxBuffer: 1024 * 1024 * 5000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return reject(error);
        }
        resolve();
      }
    );
  });
}

// app.get("/api/mongodb-version", async (req, res) => {
//   try {
//     // Use the 'mongod' command with '--version' option to get the MongoDB version
//     exec("mongod --version", (error, stdout, stderr) => {
//       if (error) {
//         console.error(`exec error: ${error}`);
//         return res.status(500).send(`Error checking MongoDB version: ${error}`);
//       }
//       // Extract the version information from the command output
//       const versionInfo = stdout.trim();

//       console.log(`MongoDB Version: ${versionInfo}`);

//       res.status(200).json({
//         success: true,
//         version: versionInfo,
//       });
//     });
//   } catch (err) {
//     console.error(`Error: ${err}`);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred while checking MongoDB version",
//     });
//   }
// });

app.get("/api/mongodb-version", async (req, res) => {
  try {
    // Use the 'mongod' command with '--version' option to get the MongoDB version
    exec("mongod --version", (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return res.status(500).send(`Error checking MongoDB version: ${error}`);
      }
      // Extract the MongoDB version information from the command output
      const mongodbVersion = stdout.trim();

      // Use the 'mongodump' command with '--version' option to get the mongodump version
      exec("mongodump --version", (dumpError, dumpStdout, dumpStderr) => {
        if (dumpError) {
          console.error(`exec error: ${dumpError}`);
          return res.status(500).send(`Error checking mongodump version: ${dumpError}`);
        }
        // Extract the mongodump version information from the command output
        const mongodumpVersion = dumpStdout.trim();

        // Use the 'mongorestore' command with '--version' option to get the mongorestore version
        exec("mongorestore --version", (restoreError, restoreStdout, restoreStderr) => {
          if (restoreError) {
            console.error(`exec error: ${restoreError}`);
            return res.status(500).send(`Error checking mongorestore version: ${restoreError}`);
          }
          // Extract the mongorestore version information from the command output
          const mongorestoreVersion = restoreStdout.trim();

          console.log(`MongoDB Version: ${mongodbVersion}`);
          console.log(`mongodump Version: ${mongodumpVersion}`);
          console.log(`mongorestore Version: ${mongorestoreVersion}`);

          res.status(200).json({
            success: true,
            mongodbVersion,
            mongodumpVersion,
            mongorestoreVersion,
          });
        });
      });
    });
  } catch (err) {
    console.error(`Error: ${err}`);
    res.status(500).json({
      success: false,
      message: "An error occurred while checking version information",
    });
  }
});


app.get("/api/backup", async (req, res) => {
  try {
    const { folder, dbUrl } = req.query;

    const fileName = `backup_${Date.now()}`;
    const filePath = path.join(__dirname, fileName);

    console.log("Backup Process started...");

    const command = `mongodump --forceTableScan --out=${filePath} --uri=${dbUrl}`;
    await promisifyExec(command); // Use a promisified version of exec

    const data = await fs.readFile(filePath);

    const fileLocation = folder ? `${folder}/${fileName}` : fileName;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileLocation,
      Body: data,
      ContentType: "application/octet-stream",
      ContentDisposition: `DB Backup file ${fileLocation} and time = ${Date.now()}`,
    };

    const uploadResult = await s3.upload(params).promise();

    console.log(`Backup uploaded successfully to ${bucket}/${fileName}`);
    await fs.unlink(filePath);
    console.log("File deleted");

    const location = uploadResult.Location; // Get the S3 object location

    res.status(200).json({
      success: true,
      message: `Backup uploaded successfully to ${location}`,
      location, // Shorthand property name
    });
  } catch (err) {
    console.error(`Error: ${err}`);
    res.status(500).json({
      success: false,
      message: "An error occurred",
    });
  }
});


app.get("/api/restore", async (req, res) => {
  const { dbUrl, key } = req.query;

  const fileName = `backup.sql`;
  const filePath = path.join(__dirname, fileName);

  const params = {
    Bucket: process.env.S3_BUCKET_NAME, // Replace with your S3 bucket name
    Key: key,
  };

  try {
    // Download the backup file from S3
    console.log("Downloading database backup file from S3...");
    const response = await s3.getObject(params).promise();

    if (!response.Body) {
      console.log("Empty response body received from S3.");
      return res.status(500).send("Empty response body received from S3.");
    }

    // Write the backup file to the local file system
    await fs.writeFile(filePath, response.Body);
    console.log("Database backup file downloaded successfully!");

    // Restoring the database
    console.log("Restoring the database...");

    const command = `mongorestore --uri=${dbUrl} --drop --archive=${filePath}`;

    exec(
      command,
      { maxBuffer: 1024 * 1024 * 5000 }, // Set maxBuffer option to 5000 MB (adjust as needed)
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return res.status(500).send(`Error restoring database: ${error}`);
        }
        console.log("Database restored!");
        fs.unlinkSync(filePath); // Delete the backup file after restoration
        res.send("Database restored successfully!");
      }
    );
  } catch (err) {
    console.error(`S3 download error: ${err}`);
    res.status(500).send(`Error downloading from S3: ${err}`);
  }
});

module.exports = app;
