import { resolve } from "path";

export default {
  webpack: (config) => {
    // Resolve public/ directory for static assets
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.modules = [...(config.resolve.modules || []), "public"];
    return config;
  },
};