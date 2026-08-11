import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  // Ambil token dari cookie
  const token = request.cookies.get("auth_token")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";

  // 1. Jika pengguna mengakses halaman Login
  if (isLoginPage) {
    if (token) {
      try {
        // Coba verifikasi. Jika token masih hidup, lempar ke dashboard
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET || "kunci-rahasia-super-aman",
        );
        await jwtVerify(token, secret);
        return NextResponse.redirect(new URL("/", request.url));
      } catch (e) {
        // Token kedaluwarsa, biarkan di halaman login
      }
    }
    return NextResponse.next();
  }

  // 2. Jika pengguna mengakses halaman lain (Dashboard, dll)
  if (!token) {
    // Tidak ada token = tendang ke login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Verifikasi keaslian dan masa berlaku token
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "kunci-rahasia-super-aman",
    );
    await jwtVerify(token, secret);

    // Lolos verifikasi, izinkan masuk halaman
    return NextResponse.next();
  } catch (error) {
    // Token rusak atau kedaluwarsa = tendang ke login
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Konfigurasi: Halaman apa saja yang harus dicegat oleh Middleware?
export const config = {
  matcher: [
    /*
     * Mencegat seluruh rute, KECUALI:
     * - Rute API backend authentication (/api/auth/...)
     * - File statis Next.js (/_next/...)
     * - Gambar dan icon (favicon, dll)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
