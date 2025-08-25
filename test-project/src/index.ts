import express from 'express';
import { UserController } from './components/UserController';
import { DatabaseService } from './utils/DatabaseService';
import { Logger } from './utils/Logger';

const app = express();
const port = process.env.PORT || 3000;

// Initialize services
const logger = new Logger();
const dbService = new DatabaseService();
const userController = new UserController(dbService, logger);

app.use(express.json());

// Routes
app.get('/users', userController.getUsers.bind(userController));
app.post('/users', userController.createUser.bind(userController));
app.get('/users/:id', userController.getUserById.bind(userController));

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});