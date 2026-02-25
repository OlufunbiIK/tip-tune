import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { paginate } from '../common/helpers/paginate.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Check if username already exists
      const existingUsername = await this.usersRepository.findOne({
        where: { username: createUserDto.username, isDeleted: false },
      });
      if (existingUsername) {
        throw new ConflictException(`Username '${createUserDto.username}' is already taken`);
      }

      // Check if email already exists
      const existingEmail = await this.usersRepository.findOne({
        where: { email: createUserDto.email, isDeleted: false },
      });
      if (existingEmail) {
        throw new ConflictException(`Email '${createUserDto.email}' is already registered`);
      }

      // Check if wallet address already exists
      const existingWallet = await this.usersRepository.findOne({
        where: { walletAddress: createUserDto.walletAddress, isDeleted: false },
      });
      if (existingWallet) {
        throw new ConflictException(`Wallet address '${createUserDto.walletAddress}' is already registered`);
      }

      const user = this.usersRepository.create({
        ...createUserDto,
        isArtist: createUserDto.isArtist ?? false,
      });

      const savedUser = await this.usersRepository.save(user);
      this.logger.log(`User created successfully: ${savedUser.id}`);
      
      return savedUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to create user: ${error.message}`);
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedResponse<User>> {
    const take = Math.max(1, Math.min(limit, 100));
    const skip = (Math.max(1, page) - 1) * take;
    const [users, total] = await this.usersRepository.findAndCount({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return paginate(users, { page, limit: take, total });
  }

  async findOne(id: string): Promise<User> {
    if (!id || !this.isValidUUID(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const user = await this.usersRepository.findOne({ where: { id, isDeleted: false } });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { username, isDeleted: false } });
    
    if (!user) {
      throw new NotFoundException(`User with username '${username}' not found`);
    }
    
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email, isDeleted: false } });
    
    if (!user) {
      throw new NotFoundException(`User with email '${email}' not found`);
    }
    
    return user;
  }

  async findByWalletAddress(walletAddress: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { walletAddress, isDeleted: false } });
    
    if (!user) {
      throw new NotFoundException(`User with wallet address '${walletAddress}' not found`);
    }
    
    return user;
  }

  async findArtists(): Promise<User[]> {
    return this.usersRepository.find({
      where: { isArtist: true, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    try {
      // Check for unique constraint violations
      if (updateUserDto.username && updateUserDto.username !== user.username) {
        const existingUsername = await this.usersRepository.findOne({
          where: { username: updateUserDto.username },
        });
        if (existingUsername) {
          throw new ConflictException(`Username '${updateUserDto.username}' is already taken`);
        }
      }

      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingEmail = await this.usersRepository.findOne({
          where: { email: updateUserDto.email },
        });
        if (existingEmail) {
          throw new ConflictException(`Email '${updateUserDto.email}' is already registered`);
        }
      }

      if (updateUserDto.walletAddress && updateUserDto.walletAddress !== user.walletAddress) {
        const existingWallet = await this.usersRepository.findOne({
          where: { walletAddress: updateUserDto.walletAddress },
        });
        if (existingWallet) {
          throw new ConflictException(`Wallet address '${updateUserDto.walletAddress}' is already registered`);
        }
      }

      Object.assign(user, updateUserDto);
      
      const updatedUser = await this.usersRepository.save(user);
      this.logger.log(`User updated successfully: ${id}`);
      
      return updatedUser;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update user: ${error.message}`);
      throw new BadRequestException(`Failed to update user: ${error.message}`);
    }
  }


  // Soft delete
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    try {
      user.deletedAt = new Date();
      user.isDeleted = true;
      await this.usersRepository.save(user);
      this.logger.log(`User soft-deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to soft-delete user: ${error.message}`);
      throw new BadRequestException(`Failed to soft-delete user: ${error.message}`);
    }
  }

  // Hard delete (admin only)
  async hardDelete(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    try {
      await this.usersRepository.remove(user);
      this.logger.log(`User hard-deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to hard-delete user: ${error.message}`);
      throw new BadRequestException(`Failed to hard-delete user: ${error.message}`);
    }
  }

  // Restore (admin only)
  async restore(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id }, withDeleted: true });
    if (!user) throw new NotFoundException('User not found');
    user.deletedAt = null;
    user.isDeleted = false;
    return this.usersRepository.save(user);
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

