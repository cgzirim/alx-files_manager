import Bull from 'bull';
import { promisify } from 'util';
import imageThumbnail from 'image-thumbnail';
import dotenv from 'dotenv';
import dbClient from './utils/db';
import sendMail from './utils/mailer';

dotenv.config();

const fs = require('fs');
const { ObjectId } = require('mongodb');

const RedisOpts = {
  port: process.env.RD_PORT || '6379',
  host: process.env.RD_HOST || '127.0.0.1',
};
const fileQueue = new Bull('file-queue', { redis: RedisOpts });
const userQueue = new Bull('userQueue', { redis: RedisOpts });

// Generate 3 thumbnails with width = 100, 250 and 500 for each file
// found in file-queue jobs
fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;
  if (!fileId) done(new Error('Missing fileId'));
  if (!userId) done(new Error('Missing userId'));

  const filesCollection = dbClient.db.collection('files');
  const file = await filesCollection.findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });
  if (!file) done(new Error('File not found'));
  if (!fs.existsSync(file.localPath)) done(new Error('File not found'));

  const writeFileAsync = promisify(fs.writeFile);

  try {
    let thumbnail = await imageThumbnail(file.localPath, { width: 100 });
    await writeFileAsync(`${file.localPath}_100`, thumbnail);

    thumbnail = await imageThumbnail(file.localPath, { width: 250 });
    await writeFileAsync(`${file.localPath}_250`, thumbnail);

    thumbnail = await imageThumbnail(file.localPath, { width: 500 });
    await writeFileAsync(`${file.localPath}_500`, thumbnail);
    
    done()
  } catch (err) {
    console.log(done(new Error(err)));
  }
});

// Send "Welcome email" to new user
userQueue.process(async (job, done) => {
  const { userId } = job.data;
  if (!userId) done(new Error('Missing userId'));

  const userCollection = dbClient.db.collection('users');
  const user = await userCollection.findOne({ _id: ObjectId(userId) });
  if (!user) done(new Error('User not found'));

  console.log(`Welcome ${user.email}!`);

  const username = user.email.split('@')[0];
  const mailOptions = {
    from: `ALX Files Manager <${process.env.EMAIL_ADD}>`,
    to: user.email,
    subject: 'Welcome to ALX-Files_Manager by Chigozirim',
    html: [
      '<div>',
      `<h3>Hello ${username} 👋🏼,</h3>`,
      'Welcome to <a href="https://github.com/iChigozirim/alx-files_manager">',
      'ALX-Files_Manager</a>, ',
      'a simple file management API built with Node.js by ',
      '<a href="https://github.com/iChigozirim">Chigozirim Igweamaka</a>. ',
      'We hope it meets your needs 🙂.',
      '</div>',
    ].join(''),
  };
  try {
    sendMail(mailOptions)
      .then((result) => done(result))
      .catch((error) => done(error));
  } catch (error) { console.log(error); }
});
