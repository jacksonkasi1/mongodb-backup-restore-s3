const fs = require("fs").promises;
const util = require("util");
const path = require("path");
const AWS = require("aws-sdk");
const cron = require("node-cron");
const exec = util.promisify(require("child_process").exec);

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

async function performBackup() {
  try {
    const { MONGODB_URI, S3_BUCKET_NAME } = process.env;

    const fileName = `backup_${Date.now()}`;
    const filePath = path.join(__dirname, fileName);

    console.log("Backup Process started...");

    const command = `mongodump --forceTableScan --out=${filePath} --uri=${MONGODB_URI}`;

    await exec(command, { maxBuffer: 1024 * 1024 * 5000 }); // Set maxBuffer option to 5000 MB (adjust as needed)

    const data = await fs.readFile(filePath);

    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: fileName,
      Body: data,
      ContentType: "application/octet-stream",
      ContentDisposition: `attachment; filename="${fileName}"`,
    };

    await s3.upload(params).promise();

    console.log(`Backup uploaded successfully to S3: ${fileName}`);
    await fs.unlink(filePath);
    console.log("File deleted");
  } catch (error) {
    console.error(`Error during backup: ${error}`);
  }
}

function startBackupCronJob() {
  cron.schedule("0 5 * * *", async () => {
    console.log("Starting backup cron job...");
    await performBackup();
  });

  console.log("Backup cron job scheduled to run every day at 5 AM.");
}

module.exports = startBackupCronJob;
