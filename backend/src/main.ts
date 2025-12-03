import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // CORS 모두 허용
    app.enableCors();

    // Validation Pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        }),
    );

    // Swagger 설정
    const config = new DocumentBuilder()
        .setTitle('Squid Meme API')
        .setDescription('Squid Meme 게임 백엔드 API')
        .setVersion('1.0')
        .addApiKey(
            {
                type: 'apiKey',
                name: 'x-wallet-address',
                in: 'header',
                description: '사용자 지갑 주소',
            },
            'wallet-address',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
