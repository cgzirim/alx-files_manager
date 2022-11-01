import express from 'express';
import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import UsersController from '../controllers/UsersController';

const router = express.Router();

/** Route serving JSON payload containing status of Redis and Mongodb client */
router.get('/status', AppController.getStatus);

/** Route serving number JSON payload containing total files and users in the database  */
router.get('/stats', AppController.getStats);

/** Route to create a new user */
router.post('/users', UsersController.postNew);

/** Route to retrieve a user's info by authentication token */
router.get('/users/me', UsersController.getMe);

/** Route to sign-in a user by generating a new authentication token */
router.get('/connect', AuthController.getConnect);

/** Route to sign-out a user based on its authentication token */
router.get('/disconnect', AuthController.getDisconnect);

module.exports = router;