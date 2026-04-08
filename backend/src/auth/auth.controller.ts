import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ResetPasswordRequestDto,
  ResetPasswordDto,
} from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesion con email y contrasena' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas' })
  @ApiResponse({ status: 403, description: 'Email no verificado o cuenta desactivada' })
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(req.user);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar email con token de magic link' })
  @ApiResponse({ status: 200, description: 'Email verificado, tokens devueltos (auto-login)' })
  @ApiResponse({ status: 401, description: 'Token invalido o expirado' })
  async verifyEmail(
    @Body('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(token);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar restablecimiento de contrasena' })
  @ApiResponse({ status: 200, description: 'Si el email existe, se envia enlace de restablecimiento' })
  async forgotPassword(@Body() dto: ResetPasswordRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contrasena con token' })
  @ApiResponse({ status: 200, description: 'Contrasena restablecida, tokens devueltos (auto-login)' })
  @ApiResponse({ status: 401, description: 'Token invalido o expirado' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.resetPassword(
      dto.token,
      dto.newPassword,
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar tokens usando refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Tokens renovados' })
  @ApiResponse({ status: 401, description: 'Refresh token invalido' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    // Decode to get userId without full verification (the service will verify)
    const payload = JSON.parse(
      Buffer.from(refreshToken.split('.')[1], 'base64').toString(),
    );

    const result = await this.authService.refreshTokens(
      payload.sub,
      refreshToken,
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar email de verificacion' })
  @ApiResponse({ status: 200, description: 'Email de verificacion reenviado' })
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesion' })
  @ApiResponse({ status: 200, description: 'Sesion cerrada' })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    res.clearCookie('refresh_token');
    return { message: 'Sesion cerrada exitosamente' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Iniciar sesion con Google OAuth' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Callback de Google OAuth' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.authService.login({
      ...req.user,
      emailVerified: true,
      isActive: true,
    });
    this.setRefreshCookie(res, result.refreshToken);

    const appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3001';
    res.redirect(`${appUrl}/auth/callback?token=${result.accessToken}`);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
