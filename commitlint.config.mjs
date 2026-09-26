export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "core",
        "db",
        "ui",
        "api",
        "adapters",
        "gedcom",
        "web",
        "worker",
        "infra",
        "docs",
        "deps",
        "repo",
      ],
    ],
  },
};
