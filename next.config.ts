import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*.mp4",
        headers: [{ key: "Accept-Ranges", value: "bytes" }],
      },
    ];
  },
  async redirects() {
    return [
      // /victim/ → /applicant/ URL migration (Rule 14)
      { source: "/victim/dashboard", destination: "/applicant/dashboard", permanent: true },
      { source: "/victim/messages", destination: "/applicant/messages", permanent: true },
      { source: "/victim/find-organizations", destination: "/applicant/find-organizations", permanent: true },
      { source: "/victim/find-organizations/connect", destination: "/applicant/find-organizations/connect", permanent: true },
      { source: "/victim/case/:caseId/advocate", destination: "/applicant/case/:caseId/advocate", permanent: true },
      { source: "/victim/case/:caseId/organization", destination: "/applicant/case/:caseId/organization", permanent: true },
      { source: "/victim/organizations/:orgId", destination: "/applicant/organizations/:orgId", permanent: true },
      // API redirects
      { source: "/api/victim/geocode-address", destination: "/api/applicant/geocode-address", permanent: true },
      { source: "/api/victim/organization-connect-request", destination: "/api/applicant/organization-connect-request", permanent: true },
      { source: "/api/victim/organizations-map", destination: "/api/applicant/organizations-map", permanent: true },
      { source: "/api/victim/organizations/:path*", destination: "/api/applicant/organizations/:path*", permanent: true },
      { source: "/api/victim/support-overview", destination: "/api/applicant/support-overview", permanent: true },
    ];
  },
};

export default nextConfig;
