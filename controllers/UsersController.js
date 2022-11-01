import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = require('mongodb');

class UsersContoller {
  /**
   * Defines the endpoint 'POST /users'
   * It sends a JSON payload containing the email and ID of the newly created
   * user. Otherwise, it sends an error message with a 400 HTTP status code.
   * @param {object} req Express request object
   * @param {object} res Express response object
   */
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    const usersCollection = dbClient.db.collection('users');
    const isEmail = await usersCollection.findOne({ email });

    if (isEmail) return res.status(400).send({ error: 'Already exist' });

    const hashedPwd = sha1(password);
    const user = await usersCollection.insertOne({ email, password: hashedPwd });

    return res.status(201).send({ id: user.insertedId, email });
  }

  /**
   * Defines the endpoint 'GET /users/me'
   * It retrieves a user from its authentication ID. Otherwise,
   * sends an error (Unauthorized') with a status code 401.
   * @param {object} req Express request object.
   * @param {object} res Express response object.
   */
  static async getMe(req, res) {
    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ _id: ObjectId(userId) });

    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    return res.status(200).send({ id: user._id, email: user.email });
  }
}

module.exports = UsersContoller;
