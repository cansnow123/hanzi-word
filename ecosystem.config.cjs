module.exports = {
  apps: [
    {
      name: "hanzi-word-connect",
      script: "node",
      args: "scripts/run-next.mjs start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
