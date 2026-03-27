import { defineConfig } from "astro/config";
import react from "@astrojs/react";

const repository =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "sonata-research";
const owner = process.env.GITHUB_REPOSITORY_OWNER ?? "hsc00";
const isUserPagesRepo =
  repository.toLowerCase() === `${owner.toLowerCase()}.github.io`;
const site = `https://${owner}.github.io`;
const base = isUserPagesRepo ? "/" : `/${repository}`;

export default defineConfig({
  site,
  base,
  integrations: [react()],
});
