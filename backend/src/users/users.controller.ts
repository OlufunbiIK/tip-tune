import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: "Create a new user" })
  @ApiResponse({
    status: 201,
    description: "User created successfully",
    type: User,
  })
  @ApiResponse({ status: 400, description: "Bad Request - Invalid data" })
  @ApiResponse({
    status: 409,
    description: "Conflict - Username, email, or wallet address already exists",
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({ status: 200, description: "List of all users", type: [User] })
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get("artists")
  @ApiOperation({ summary: "Get all artists" })
  @ApiResponse({
    status: 200,
    description: "List of all artists",
    type: [User],
  })
  findArtists(): Promise<User[]> {
    return this.usersService.findArtists();
  }

  @Get("search")
  @ApiOperation({
    summary: "Search users by username, email, or wallet address",
  })
  @ApiQuery({
    name: "username",
    description: "Search by username",
    required: false,
  })
  @ApiQuery({ name: "email", description: "Search by email", required: false })
  @ApiQuery({
    name: "wallet",
    description: "Search by wallet address",
    required: false,
  })
  @ApiResponse({ status: 200, description: "User found", type: User })
  @ApiResponse({
    status: 400,
    description: "Bad Request - No search parameter provided",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async search(
    @Query("username") username?: string,
    @Query("email") email?: string,
    @Query("wallet") wallet?: string,
  ): Promise<User> {
    if (username) {
      return this.usersService.findByUsername(username);
    }
    if (email) {
      return this.usersService.findByEmail(email);
    }
    if (wallet) {
      return this.usersService.findByWalletAddress(wallet);
    }
    throw new BadRequestException(
      "At least one search parameter (username, email, or wallet) is required",
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a user by ID" })
  @ApiParam({ name: "id", description: "User UUID", type: "string" })
  @ApiResponse({ status: 200, description: "User details", type: User })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Invalid UUID format",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a user" })
  @ApiParam({ name: "id", description: "User UUID", type: "string" })
  @ApiResponse({
    status: 200,
    description: "User updated successfully",
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Invalid data or UUID format",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({
    status: 409,
    description: "Conflict - Username, email, or wallet address already exists",
  })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a user" })
  @ApiParam({ name: "id", description: "User UUID", type: "string" })
  @ApiResponse({ status: 204, description: "User deleted successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Invalid UUID format",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
