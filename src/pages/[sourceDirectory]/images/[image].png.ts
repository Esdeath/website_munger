import fs from "node:fs";
import path from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { SOURCE_DIRECTORIES, type SourceDirectory } from "../../../lib/source-types";

const IMAGE_DIRECTORIES = SOURCE_DIRECTORIES;

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
    !IMAGE_DIRECTORIES.includes(sourceDirectory as SourceDirectory) ||
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
