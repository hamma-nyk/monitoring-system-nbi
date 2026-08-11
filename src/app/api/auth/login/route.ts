import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { username, password, rememberMe } = await req.json();

    // TODO: Ganti dengan kredensial dari Database atau file .env Anda
    const validUser = "IT";
    const validPass = "kontol";

    if (username !== validUser || password !== validPass) {
      return NextResponse.json(
        { error: "Username atau password salah!" },
        { status: 401 },
      );
    }

    // Buat JWT Token
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "kunci-rahasia-super-aman",
    );
    const expiresIn = rememberMe ? "30d" : "1d"; // Jika "Ingat Saya" dicentang, aktif 30 hari

    const token = await new SignJWT({ username })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);

    // Simpan Token ke dalam HTTP-Only Cookie (Sangat Aman, tidak bisa dicuri JS/XSS)
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // Detik
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem" },
      { status: 500 },
    );
  }
}
