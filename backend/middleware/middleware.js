import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Пути, которые не требуют аутентификации
const publicPaths = [
  '/backend/routes/login',
  '/backend/routes/register',
  '/backend/routes/logout',
  '/public',
  '/login',
  '/register'
];

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  // Пропускаем публичные пути
  if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
    return NextResponse.next();
  }

  // Проверка токена для защищенных путей
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    // Если это API запрос, возвращаем JSON ошибку
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Неавторизован. Требуется вход в систему.' },
        { status: 401 }
      );
    }
    // Если это веб-страница, перенаправляем на страницу входа
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Верификация токена
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Добавляем информацию о пользователе в заголовки запроса
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId.toString());
    requestHeaders.set('x-user-role', decoded.role);
    requestHeaders.set('x-user-login', decoded.login);
    requestHeaders.set('x-user-first-name', decoded.firstName || '');
    requestHeaders.set('x-user-last-name', decoded.lastName || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.error('Ошибка верификации токена:', error);
    
    // Очищаем невалидный токен
    const response = path.startsWith('/api/')
      ? NextResponse.json(
          { error: 'Недействительный токен. Войдите снова.' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url));
    
    response.cookies.delete('auth_token');
    return response;
  }
}

// Настройка для каких путей запускать middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};