import fs from "node:fs";
import path from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";

const IMAGE_DIRECTORIES = ["shareholders", "speech"] as const;

export const getStaticPaths: GetStaticPaths = () =>
  IMAGE_DIRECTORIES.flatMap((sourceDirectory) =>
    fs
      .readdirSync(path.join(process.cwd(), sourceDirectory, "images"))
      .filter((fileName) => fileName.endsWith(".png"))
      .map((fileName) => ({
        params: {
          sourceDirectory,
          image: path.basename(fileName, ".png")
        }
      }))
  );

export const GET: APIRoute = ({ params }) => {
  const sourceDirectory = params.sourceDirectory;
  const image = params.image;

  if (
    !sourceDirectory ||
    !image ||
    !IMAGE_DIRECTORIES.includes(sourceDirectory as (typeof IMAGE_DIRECTORIES)[number]) ||
    image.includes("/") ||
    image.includes("..")
  ) {
    return new Response(null, { status: 404 });
  }

  const imagePath = path.join(process.cwd(), sourceDirectory, "images", `${image}.png`);
  return new Response(new Uint8Array(fs.readFileSync(imagePath)), {
    headers: {
      "Content-Type": "image/png"
    }
  });
};
