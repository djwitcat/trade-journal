const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "trade-journal",
      cwd: path.join(__dirname, "apps/web"),
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
