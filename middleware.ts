import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const USER = process.env.BASIC_AUTH_USER;
const PASS = process.env.BASIC_AUTH_PASS;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

console.log("[middleware] ADMIN_TOKEN present:", !!ADMIN_TOKEN, "len:", ADMIN_TOKEN?.length);


export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // (Debug temporaire pour vérifier que les variables sont bien lues)
  console.log(
    "[middleware] BASIC_AUTH_USER:",
    USER ? "(défini)" : "(vide)",
    "| BASIC_AUTH_PASS:",
    PASS ? "(défini)" : "(vide)"
  );

  // 1️⃣ Protection par mot de passe (Basic Auth)
  if (USER && PASS) {
    const header = req.headers.get('authorization') || '';
    const [scheme, encoded] = header.split(' ');
    const decoded = encoded ? Buffer.from(encoded, 'base64').toString() : '';
    const [u, p] = decoded.split(':');

    if (scheme !== 'Basic' || u !== USER || p !== PASS) {
      return new NextResponse('Auth required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm=\"Bleen Demo\"' },
      });
    }
  }

  // 2️⃣ Protection de /admin (token obligatoire)
  if (pathname.startsWith('/admin')) {
    const tokenFromHeader = req.headers.get('x-admin-token');
    const tokenFromQuery = url.searchParams.get('token');
    const ok =
      (tokenFromHeader && tokenFromHeader === ADMIN_TOKEN) ||
      (tokenFromQuery && tokenFromQuery === ADMIN_TOKEN);

      console.log("[middleware]/admin — query:", tokenFromQuery, "| header:", tokenFromHeader, "| ok:", ok);


    if (!ok) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // 3️⃣ Sinon, on laisse passer
  return NextResponse.next();
}

// Configuration : appliquer à tout le site
export const config = {
  matcher: ['/:path*'],
};

