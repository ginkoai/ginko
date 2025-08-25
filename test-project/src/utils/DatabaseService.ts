import { Logger } from './Logger';

export class DatabaseService {
  private data: Map<string, Map<string, any>> = new Map();
  private logger = new Logger();

  async findAll<T>(collection: string): Promise<T[]> {
    this.logger.debug(`Finding all records in collection: ${collection}`);
    const collectionData = this.data.get(collection);
    
    if (!collectionData) {
      return [];
    }

    return Array.from(collectionData.values());
  }

  async findById<T>(collection: string, id: string): Promise<T | null> {
    this.logger.debug(`Finding record by ID: ${id} in collection: ${collection}`);
    const collectionData = this.data.get(collection);
    
    if (!collectionData) {
      return null;
    }

    return collectionData.get(id) || null;
  }

  async create<T extends { id: string }>(collection: string, item: T): Promise<T> {
    this.logger.debug(`Creating record in collection: ${collection}`);
    
    if (!this.data.has(collection)) {
      this.data.set(collection, new Map());
    }

    const collectionData = this.data.get(collection)!;
    collectionData.set(item.id, item);
    
    return item;
  }

  async update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): Promise<T | null> {
    this.logger.debug(`Updating record: ${id} in collection: ${collection}`);
    const collectionData = this.data.get(collection);
    
    if (!collectionData) {
      return null;
    }

    const existing = collectionData.get(id);
    if (!existing) {
      return null;
    }

    const updated = { ...existing, ...updates };
    collectionData.set(id, updated);
    
    return updated;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    this.logger.debug(`Deleting record: ${id} from collection: ${collection}`);
    const collectionData = this.data.get(collection);
    
    if (!collectionData) {
      return false;
    }

    return collectionData.delete(id);
  }
}