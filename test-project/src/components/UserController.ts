import { Request, Response } from 'express';
import { DatabaseService } from '../utils/DatabaseService';
import { Logger } from '../utils/Logger';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export class UserController {
  constructor(
    private dbService: DatabaseService,
    private logger: Logger
  ) {}

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('Fetching all users');
      const users = await this.dbService.findAll<User>('users');
      res.json(users);
    } catch (error) {
      this.logger.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { name, email } = req.body;
      
      if (!name || !email) {
        res.status(400).json({ error: 'Name and email are required' });
        return;
      }

      const user: User = {
        id: this.generateId(),
        name,
        email,
        createdAt: new Date(),
      };

      const createdUser = await this.dbService.create('users', user);
      this.logger.info(`Created user: ${user.id}`);
      res.status(201).json(createdUser);
    } catch (error) {
      this.logger.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.dbService.findById<User>('users', id);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      this.logger.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}