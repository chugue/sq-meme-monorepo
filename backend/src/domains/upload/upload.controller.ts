import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@Controller('v1/upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) {}

    @Post('image')
    @ApiOperation({ summary: '이미지 업로드' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: '업로드할 이미지 파일 (최대 5MB, jpg/png/gif/webp)',
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
                    new FileTypeValidator({
                        fileType: /^image\/(jpeg|png|gif|webp)$/,
                    }),
                ],
                fileIsRequired: true,
                exceptionFactory: (error) => {
                    return new BadRequestException(
                        error || '유효하지 않은 파일입니다.',
                    );
                },
            }),
        )
        file: Express.Multer.File,
    ) {
        return this.uploadService.uploadImage(file, 'game-images');
    }
}
