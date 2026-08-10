import type { NextConfig } from "next";

// Note on "Helmet": Helmet is a security-header library built for
// Express.js apps — it doesn't plug into Next.js. Next.js has its own
// built-in way to set the same security headers Helmet would set: the
// `headers()` function below. So this file is doing the same job Helmet
// does, just using the tool that actually works with Next.js.

const securityHeaders = [
  // Stops the browser from guessing/"sniffing" file types — blocks some
  // attacks where a file pretends to be something it isn't.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Stops other websites from putting our site inside an <iframe>.
  // This prevents "clickjacking" attacks.
  { key: "X-Frame-Options", value: "DENY" },

  // Modern replacement for X-Frame-Options, does the same job.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none';" },

  // Controls how much of our URL gets sent along when a user clicks a
  // link to another site. "strict-origin-when-cross-origin" is a safe,
  // commonly recommended default.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Turns off browser features we don't use, so a bug or a bad script
  // can't turn on the camera/microphone/location without us meaning to.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },

  // Tells browsers to only ever talk to us over HTTPS for the next year.
  // Only matters once the site is actually deployed behind HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Builds a small, self-contained "standalone" version of the app.
  // This is what makes the Docker image small and fast — see the
  // Dockerfile for how it's used.
  output: "standalone",

  async headers() {
    return [
      {
        // Apply these headers to every single page and API route.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
