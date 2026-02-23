/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.kinopoisk.ru", pathname: "/**" },
      { protocol: "https", hostname: "*.kpcdn.net", pathname: "/**" },
      { protocol: "https", hostname: "image.openmoviedb.com", pathname: "/**" },
    ],
  },
};

module.exports = nextConfig;
