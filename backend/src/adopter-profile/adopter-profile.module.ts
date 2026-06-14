import { Module } from '@nestjs/common';
import { UploadModule } from '../upload/upload.module';
import { AdopterProfileService } from './adopter-profile.service';

/**
 * AdopterProfileModule — Phase 16 PROFILE-01.
 *
 * Exports AdopterProfileService so Plan 06's ApplicationsService can call
 * getMyProfile() to build the frozen profileSnapshot at apply time.
 *
 * Controller (AdopterProfileController) is registered here and owns:
 *   GET    /profile/me
 *   PATCH  /profile/section/:section
 *   POST   /profile/photos
 *   DELETE /profile/photos/:photoId
 */
@Module({
  imports: [UploadModule],
  providers: [AdopterProfileService],
  exports: [AdopterProfileService],
})
export class AdopterProfileModule {}
