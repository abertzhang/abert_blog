import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { ArticlesModule } from './modules/articles/article.module.js';
import { StatModule } from './modules/stat/stat.module.js';
import { FriendLinksModule } from './modules/friend-links/friend-links.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { BannerModule } from './modules/banner/banner.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    ArticlesModule,
    StatModule,
    FriendLinksModule,
    AdminModule,
    BannerModule,
  ],
})
export class AppModule {}
