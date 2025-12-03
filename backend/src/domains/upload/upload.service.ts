import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../common/supabase/supabase.module';

export interface UploadResult {
    url: string;
    path: string;
}

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);
    private readonly bucketName = 'squid-meme';

    constructor(
        @Inject(SUPABASE_CLIENT)
        private readonly supabase: SupabaseClient,
    ) {}

    async uploadImage(
        file: Express.Multer.File,
        folder: string = 'uploads',
    ): Promise<UploadResult> {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const extension = this.getFileExtension(file.originalname);
        const fileName = `${folder}/${timestamp}-${randomSuffix}${extension}`;

        this.logger.log(`📤 이미지 업로드 시작: ${fileName}`);

        const { data, error } = await this.supabase.storage
            .from(this.bucketName)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error) {
            this.logger.error(`❌ 이미지 업로드 실패: ${error.message}`);
            throw new Error(`이미지 업로드 실패: ${error.message}`);
        }

        // 공개 URL 생성
        const {
            data: { publicUrl },
        } = this.supabase.storage.from(this.bucketName).getPublicUrl(data.path);

        this.logger.log(`✅ 이미지 업로드 완료: ${publicUrl}`);

        return {
            url: publicUrl,
            path: data.path,
        };
    }

    async deleteImage(path: string): Promise<void> {
        this.logger.log(`🗑️ 이미지 삭제: ${path}`);

        const { error } = await this.supabase.storage
            .from(this.bucketName)
            .remove([path]);

        if (error) {
            this.logger.error(`❌ 이미지 삭제 실패: ${error.message}`);
            throw new Error(`이미지 삭제 실패: ${error.message}`);
        }

        this.logger.log(`✅ 이미지 삭제 완료`);
    }

    private getFileExtension(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        return ext ? `.${ext}` : '';
    }
}
