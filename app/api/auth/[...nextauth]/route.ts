import bcrypt from "bcryptjs";
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { query } from "@/lib/db";

type DatabaseUser = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string | null;
  role: string;
  image: string | null;
  email_verified_at: Date | null;
};

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      portal: { label: "Portal", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;

      try {
        const result = await query(
          `SELECT id, name, email, password_hash, role, image, email_verified_at
           FROM users
           WHERE LOWER(email) = LOWER($1)`,
          [credentials.email.trim()],
        );
        const user = result.rows[0] as DatabaseUser | undefined;

        if (!user?.password_hash) return null;

        const passwordIsValid = await bcrypt.compare(
          credentials.password,
          user.password_hash,
        );
        if (!passwordIsValid) return null;

        const isCandidateLogin = credentials.portal === "candidate";
        if (isCandidateLogin) {
          if (
            (user.role !== "candidate" &&
              user.role !== "company_coordinator" &&
              user.role !== "department_coordinator" &&
              user.role !== "panelist") ||
            !user.email_verified_at
          ) {
            return null;
          }
        } else if (user.role !== "admin") {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      } catch (error: unknown) {
        console.error("Auth error:", error);
        return null;
      }
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      const hasVerifiedGoogleEmail =
        profile !== undefined &&
        "email_verified" in profile &&
        profile.email_verified === true;
      if (!user.email || !hasVerifiedGoogleEmail) return false;

      const existingResult = await query(
        `SELECT id, name, email, role, image, email_verified_at
         FROM users
         WHERE LOWER(email) = LOWER($1)`,
        [user.email],
      );
      let databaseUser = existingResult.rows[0] as DatabaseUser | undefined;

      if (databaseUser && databaseUser.role !== "candidate") {
        return false;
      }

      if (databaseUser) {
        const verifiedResult = await query(
          `UPDATE users
           SET email_verified_at = CURRENT_TIMESTAMP,
               name = COALESCE(name, $1),
               image = COALESCE(image, $2),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING id, name, email, role, image, email_verified_at`,
          [user.name, user.image, databaseUser.id],
        );
        databaseUser = verifiedResult.rows[0] as DatabaseUser;
      } else {
        const createdResult = await query(
          `INSERT INTO users (name, email, role, image, email_verified_at)
           VALUES ($1, LOWER($2), 'candidate', $3, CURRENT_TIMESTAMP)
           RETURNING id, name, email, role, image, email_verified_at`,
          [user.name, user.email, user.image],
        );
        databaseUser = createdResult.rows[0] as DatabaseUser;
      }

      user.id = databaseUser.id;
      user.name = databaseUser.name;
      user.email = databaseUser.email;
      user.image = databaseUser.image;
      user.role = databaseUser.role;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.SECRET || "default_secret",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
