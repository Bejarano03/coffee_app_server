import { Module } from "@nestjs/common";
import { UsersService } from "./user.service";
import { PrismaModule } from "../prisma/prisma.module";
import { UserController } from "./user.controller";

@Module({
    imports: [PrismaModule],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UserController],
})
export class UserModule {}